var fs = require('fs');
var async = require('async');
var crypto = require('crypto');
var zlib = require('zlib');
var path = require('path');
var assert = require('assert');
var _ = require('underscore');
var packutil = require('./packutil');
var WritableStream = require('./writablestream').WritableStream;
var jsdiff = require('diff');

var NUL = '\0';
var REPO_PATH = 'pages.git';
var ENCODING = 'utf8';

var OBJ_NONE = 0;
var OBJ_COMMIT = 1;
var OBJ_TREE = 2;
var OBJ_BLOB = 3;
var OBJ_TAG = 4;
var OBJ_OFS_DELTA = 6;
var OBJ_REF_DELTA = 7;

var memo = {};
var memoIdQueue = [];
var MEMOIZE_NUMBERS_LIMIT = 10000;
var MEMOIZE_ENTITY_MAXSIZE = 40960;

var init = function(repopath, callback) {
    REPO_PATH = repopath;
    fs.mkdir(REPO_PATH, function(err) {
        if (err) {
            if (err.code == 'EEXIST') {
                callback(new Error(REPO_PATH+" already exists"));
            } else {
                throw err;
            }
        } else {
            async.series([
                async.apply(async.map, [REPO_PATH + '/objects', REPO_PATH + '/refs'],fs.mkdir),
                async.apply(fs.mkdir, REPO_PATH + '/refs/heads'),
                async.apply(fs.writeFile, REPO_PATH + '/HEAD','ref: refs/heads/master'),
            ], callback
            );
        }
    });
}

var _serializeBlob = function(content) {
    return 'blob ' + content.length + NUL + content;
}

var _hash = function(data) {
    return crypto.createHash('sha1').update(data, 'binary').digest('hex');
}

var _createObjectBucket = function(id, callback) {
    var bucketPath = REPO_PATH + '/objects/' + id.substr(0,2);
    fs.mkdir(bucketPath, function(err) {
        callback(err, bucketPath);
    });
}

var _serializeTree = function (tree) {
    var ws = new WritableStream();
    Object.keys(tree).sort().forEach(function(blobName) {
        ws.write(new Buffer("100644 " + blobName + "\0", ENCODING));
        ws.write(new Buffer(tree[blobName], 'hex'));
    });
    ws.buffers.unshift(new Buffer("tree " + ws.getLength() + "\0", ENCODING));

    return ws.getBuffer();
}

var _storeObject = function(serialized, callback) {
    var id = _hash(serialized);

    zlib.deflate(serialized, function (err, deflatedObject) {
        _createObjectBucket(id, function(err, bucketPath) {
            var objectPath = path.join(bucketPath, id.substr(2));
            fs.writeFile(objectPath, deflatedObject, function (err) {
                callback(err, id);
            });
        });
    });
}


var getCommitIdFromHEAD = function (callback) {

    if(path.existsSync(REPO_PATH + '/HEAD')) {
        // We didn't use fs.readFile because of its bug on Windows.
        // Fortunately, it has been fixed in v0.6 branch of Node.js.
        // See https://github.com/joyent/node/issues/3051
        var data = fs.readFileSync(REPO_PATH + '/HEAD');
        assert.ok(data);
        var refName = data.toString().split('\n')[0].substr(5);
        var ref = path.join(REPO_PATH, refName);

        if (path.existsSync(ref)) {
            var id = fs.readFileSync(ref);
            if(id){
                callback(null, id.slice(0, 40).toString());
            }else{
                callback(null, null);
            }
        } else if (path.existsSync(path.join(REPO_PATH, 'packed-refs'))) {
            var refs = fs.readFileSync(path.join(REPO_PATH, 'packed-refs')).toString().split('\n');
            refs.forEach(function (ref) {
                if (ref && ref[0] != '#') {
                    var pair = ref.split(' ');
                    if (pair[1] == refName) {
                        callback(null, pair[0]);
                    }
                }
            });
        } else {
            callback(new Error(ref + ' does not exist'));
        }
    } else {
        callback(new Error('HEAD does not exist'));
    }
}

var _serializeCommit = function (commit) {
    var raw = '';

    raw += 'tree ' + commit.tree +'\n';
    if (commit.parent) {
        raw += 'parent ' + commit.parent + '\n';
    }
    raw += 'author ' + commit.author + '\n';
    raw += 'committer ' + commit.committer + '\n\n';
    raw += commit.message;
    return new Buffer('commit ' + Buffer.byteLength(raw, ENCODING) + NUL + raw, ENCODING);
}

var _storeFiles = function(files, callback){
    var tree = {};
    async.forEach(_.keys(files), function (filename, cb) {
        _storeObject(_serializeBlob(files[filename]), function (err, id) {
            tree[filename] = id;
            cb(err);
        });
    }, function (err) {
        callback(err, tree);
    })
}

/**
 *
 * @param commitData doesn't have treeId
 * @param tree
 * @param callback
 * @private
 */
var createCommitFromTree = function(commitData, tree, callback) {
    _storeObject(_serializeTree(tree), function(err, id) {
        commitData.tree = id;
        _storeObject(_serializeCommit(commitData), function(err, id) {
            fs.writeFile(REPO_PATH + '/refs/heads/master', id, function(err) {
                callback(err, id);
            });
        });
    });
}

/**
 * commit request 객체를 이용해서 commit Data 구조를 만든다.
 *
 * @param request = {
 *              files: { 'welcome': 'welcome new pages.....', ...},
 *              user: { name: .., id: .., email: .., timezone: '+0900'},
 *              message: 'initial commit'
 *          }
 * @return commitData
 * @private
 */

var _prepareCommitData = function(request){
    var unixtime = Math.round(new Date().getTime() / 1000);
    var writer = request.user.name + ' <' + request.user.email + '> ' + unixtime + ' ' + request.user.timezone;
    return {
        author: writer,
        committer: writer,
        message: request.message
    };
}

/**
 * commit request 객체를 이용해서 커밋작업을 한다.
 *
 * @param request = {
 *              files: { 'welcome': 'welcome new pages.....', ...},
 *              user: { name: .., id: .., email: .., timezone: '+0900'},
 *              message: 'initial commit'
 *          }
 * @param callback (err, commitId)
 */
var commit = function(request, callback) {
    var tree = {};
    var commitData = _prepareCommitData(request);

    async.series({
        storeFiles: function(cb) {
           _storeFiles(request.files, function(err, data){
               tree = data;
               cb(err);
           });
        },
        commit: function(cb) {
            getCommitIdFromHEAD(function(err, parentId) {
                if (parentId) {
                    commitData.parent = parentId;
                    _getParentTree(parentId, function(err, parentTree) {
                        for (var key in parentTree) {
                            if (!tree[key]) {
                                tree[key] = parentTree[key];
                            }
                        }
                        createCommitFromTree(commitData, tree, cb);
                    });
                } else {
                    createCommitFromTree(commitData, tree, cb);
                }
            });
        }
    }, function(err, result) { callback(err, result.commit); } ); // result.commit == createCommitFromTree의 cb결과
}

var _getObjectPath = function(id) {
    return path.join(REPO_PATH, 'objects', id.substr(0, 2), id.substr(2));
}

var _parseCommitBody = function(buffer) {
    //             /tree 635a6d85573c97658e6cd4511067f2e4f3fe48cb
    // fieldPart --|parent 0cc71c0002496eccbe919c2e5f4c0616f9f2e611
    //             |author Yi, EungJun <semtlenori@gmail.com> 1333091842 +0900
    //             \committer Yi, EungJun <semtlenori@gmail.com> 1333091842 +0900
    //
    //   message -- Remove duplication between gitfs.createTreeRaw() and its test.

    var commit = {};
    var parts = buffer.toString('utf8').split('\n\n');
    var fieldPart = parts[0];
    commit.message = parts[1];

    fieldPart.split('\n').forEach(function (line) {
        // tree      635a6d85573c97658e6cd4511067f2e4f3fe48cb
        // parent    0cc71c0002496eccbe919c2e5f4c0616f9f2e611
        // author    Yi, EungJun <semtlenori@gmail.com> 1333091842 +0900
        // committer Yi, EungJun <semtlenori@gmail.com> 1333091842 +0900
        // \_______/ \_________________________________________________/
        //     |                          |
        // category                      data
        var index = line.indexOf(' ');
        var category = line.substr(0, index);
        var data = line.substr(index + 1);
        switch(category) {
            case 'tree':
            case 'parent':
                commit[category] = data
                break;
            case 'author':
            case 'committer':
                var matches = data.match(/^(.*?) <([^<>]*)> (\d*) (.\d*)/);

                commit[category] = {
                    name: matches[1],
                    email: matches[2],
                    unixtime: matches[3],
                    timezone: matches[4],
                }
                break;
        }
    });

    return commit;
}

//
// buffer contents
// `"tree" <SP> content-length <NUL> 1*("100644" <SP> wikipage-name <NUL> sha-1)`
var _parseTreeBody = function(buffer) {
    var tree = {};
    var _getParsedFileNameByNul = function (bufferString) {
        var permissionStringRemoved = bufferString.split(NUL, 1)[0];
        return permissionStringRemoved.substring(permissionStringRemoved.indexOf(' ') + 1);
    }

    for (var POS = 0; POS < buffer.length; POS++) {
        if (buffer[POS] == 0) {
            var SHA1CHARACTER_LENGTH = 20;
            var filename = _getParsedFileNameByNul(buffer.toString('utf8', 0, POS));
            var id = buffer.slice(POS + 1, POS + 1 + SHA1CHARACTER_LENGTH).toString('hex');

            // tree = {
            //     <filename>: <id>,
            //     ...
            // }
            tree[filename] = id;
            buffer = buffer.slice(POS + 1 + SHA1CHARACTER_LENGTH);
            POS = 0;
        }
    }
    return tree;
}

var _parseObject = function(type, body) {
    switch (type) {
        case OBJ_COMMIT:
            return _parseCommitBody(body);
        case OBJ_TREE:
            return _parseTreeBody(body);
        case OBJ_BLOB:
        case OBJ_TAG:
            return body;
        default:
            throw new Error("Unknown type: " + type);
    }
}

// read a git object from packed objects.
var _readObjectFromPack = function(id, callback) {
    fs.readdir(path.join(REPO_PATH, 'objects/pack'), function(err, files) {
        if (err) return callback(err);

        var _find = function(files) {
            if (!files) {
                callback(new Error("Object '" + id + "' does not exist."));
            }

            var matched = files.pop().match(/pack-([0-9abcdef]{40}).idx/)

            if (!matched) {
                return _find(files);
            }

            var packId = matched[1];

            packutil.load(REPO_PATH, packId, function(err, pack) {
                pack.getObject(id, function(err, type, body) {
                    if (body) {
                        return callback(null, _parseObject(type, body));
                    } else {
                        return _find(files);
                    }
                });
            });
        }

        _find(files);
    });
}

// read a git object from loose objects.
var _readObjectFromLoose = function(id, callback) {
    assert.ok(typeof(id) == 'string');
    zlib.inflate(fs.readFileSync(_getObjectPath(id)), function(err, buffer) {
        if (err) throw err;
        var header = buffer.toString().split(NUL, 1)[0];
        var body = buffer.slice(header.length + 1);
        var headerFields = header.split(' ');
        var type = {
            'commit': OBJ_COMMIT,
            'tree': OBJ_TREE,
            'blob': OBJ_BLOB,
            'tag': OBJ_TAG,
        }[headerFields[0]];
        callback(err, _parseObject(type, body));
    });
}

var readObject = function(id, callback) {
    assert.equal(typeof(id), 'string');
    if (!id) {
        throw new Error("object id is empty: " + id);
    }
    if (id.toString().length > 40) {
        throw new Error("id.length > 40: " + id);
    }

    var object = memo[id];

    if (object) {
        return callback(null, object);
    }

    var cb = function(err, object) {
        if (err) return callback(err);

        if (object.length <= MEMOIZE_ENTITY_MAXSIZE) {
            while (memoIdQueue.length >= MEMOIZE_NUMBERS_LIMIT) {
                delete memo[memoIdQueue.shift()];
            }
            memo[id] = object;
            memoIdQueue.push(id);
        }

        callback(null, object);
    }

    if (path.existsSync(_getObjectPath(id))) {
        _readObjectFromLoose(id, cb);
    } else {
        _readObjectFromPack(id, cb);
    }
}

/**
 * parentID를 이용해 현재 tree가 참조하는 부모 tree 객체를 얻어온다.
 *
 * @param callback (err, tree)
 */
var _getParentTree = function(parentId, callback) {
    readObject(parentId, function(err, parentCommit) {
        readObject(parentCommit.tree, callback);
    });
}

var show = function(filename, commitId, callback) {
    readObject(commitId, function(err, commit) {
        if (err) throw err;
        readObject(commit.tree, function(err, tree) {
            if (tree[filename]) {
                readObject(tree[filename], function(err, content) {
                    callback(err, content, commit);
                });
            } else {
                callback(new Error("'" + filename + "' not found in the commit " + commitId));
            }
        });
    });
}

/**
 * 'query'의 `until` 에서 `offset` 만큼 떨어져있는 커밋을 찾는다.
 * 실제로 변경이 있었던 커밋만 로그에 포함시키기 위해, blob id 가 바뀌었는지 검사한다.
 *
 * Query:
 *     queryLog() 의 설명을 볼 것
 *     다만 `since` 는 무시된다.
 *
 * @param {Object} query
 * @param {Function} callback (err, id)
 * @private
 */
var _computeCommitOffset = function(query, callback) {
    if (query.offset < 0) {
        // query.until 부터 HEAD 까지의 커밋을 모두 얻어서,
        // query.until 에서 query.offset 만큼 떨어진 커밋을 돌려준다.
        getCommitIdFromHEAD(function(err, id) {
            _queryLog({
                filename: query.filename,
                until: id,
                since: query.until
            }, null, function(err, commits) {
                var index = commits.ids.length + query.offset;
                if (index < 0) {
                    index = 0;
                }
                callback(err, commits.ids[index]);
            });
        });
    } else if (query.offset > 0) {
        // query.until과 그 parent commit들을,
        // query.until에 가까운 순으로 최대 query.offset + 1 개 만큼 얻은 뒤,
        // 가장 오래된 커밋을 돌려준다.
        _queryLog({
            filename: query.filename,
            until: query.until,
            limit: query.offset + 1
        }, null, function(err, commits) {
            callback(err, commits.ids[query.offset]);
        });
    } else {
        // query.until을 그대로 반환한다.
        callback(null, query.until);
    }
}

/**
 * `query`로 로그를 찾는다.
 *
 * Query:
 *     - `filename` 파일명 e.g.) 'frontpage'
 *     - `until` 가져올 커밋의 범위 (이 커밋까지) e.g.) 'f96845522d7a2de3c0c4677ac96f6640ceb19055'
 *     - `offset` until에 대한 offset (음수도 가능) e.g.) 1
 *     - `since` 가져올 커밋의 범위 (이 커밋 이후) e.g.) '0cc71c0002496eccbe919c2e5f4c0616f9f2e611'
 *     - `limit` 가져올 커밋의 최대 갯수. e.g.) 30
 *
 * @param {Query} query
 * @param {Function} callback (err, commits)
 */
var queryLog = function(query, callback) {
    if (!query.until || query.until == 'HEAD') {
        getCommitIdFromHEAD(function(err, head) {
            if (err) return callback(err, null);
            query.until = head;
        });
    }

    _computeCommitOffset(query, function(err, id) {
        if (err) return callback(err, null);
        query.until = id;
        _queryLog(query, null, callback);
    });
}

/**
 * `query`로 로그를 찾는다.
 * 실제로 변경이 있었던 커밋만 로그에 포함시키기 위해, blob id 가 바뀌었는지 검사한다.
 *
 * Query:
 *     queryLog() 의 설명을 볼 것
 *     다만 `offset` 은 무시된다.
 *
 * @param {Object} query
 * @param {Integer} previousBlobId
 * @param {Function} callback (err, commits)
 * @private
 */
var _queryLog = function(query, previousBlobId, callback) {
    var nextLimit = query.limit;

    // Return an empty array if there is no need to get log.
    if (query.limit === 0 || query.until == query.since) {
        var empty = [];
        empty.ids = [];
        return callback(null, empty);
    }

    // Start from query.until.
    readObject(query.until, function(err, commit) {
        if (err) return callback(err);
        assert.ok(commit.tree);
        readObject(commit.tree, function(err, tree) {
            if (err) return callback(err);

            var commits = [];

            // Include this commit if it has query.filename.
            if (tree[query.filename] && previousBlobId != tree[query.filename]) {
                if (query.limit > 0) {
                    nextLimit = query.limit - 1;
                }
                commits = [commit];
                previousBlobId = tree[query.filename];
                commits.ids = [query.until];
            } else {
                commits.ids = [];
            }

            // Continue if this commit has a parent.
            if (commit.parent) {
                _queryLog({
                    filename: query.filename,
                    until: commit.parent,
                    since: query.since,
                    limit: nextLimit
                }, previousBlobId, function(err, nextCommits) {
                    var ids = commits.ids.concat(nextCommits.ids);
                    commits = commits.concat(nextCommits);
                    commits.ids = ids;
                    callback(err, commits);
                });
            } else {
                callback(err, commits);
            }
        });
    });
}

/**
 * filename을 기준으로 로그 출력
 * @param filename
 * @param callback
 */
var log = function(filename, limit, callback) {
    getCommitIdFromHEAD(function(err, id) {
        _queryLog({filename: filename, until: id, limit: limit}, null, callback);
    });
}

/**
 * Head Commit의 tree 객체를 콜백으로 넘긴다.
 * @param callback (err, tree)
 */
var getHeadTree = function(callback){
    getCommitIdFromHEAD(function (err, id) {
        readObject(id, function (err, commit) {
            readObject(commit.tree, function(err, tree) {
                callback(err, tree);
            });
        });
    });
}

var getHeadCommit = function (callback) {
    getCommitIdFromHEAD(function (err, id) {
        if (err) throw err;
        readObject(id, function(err, commit){
            callback(err, commit);
        });
    });
}

var pendingToCommit = {}

/**
 * add target to commit
 *
 * @param target =  {
 *              name: ...
 *              content: ...
 *          }
 */
var add = function(user, target){
    var keyname = target.path + ":" + target.name;
    pendingToCommit.user = pendingToCommit.user || {};
    pendingToCommit.user[user.email] = pendingToCommit.user[user.email] || {};
    pendingToCommit.user[user.email][keyname] = target;
};

var status = function (user) {
    pendingToCommit.user = pendingToCommit.user || {};
    return pendingToCommit.user[user.email];
};

var setRepoPath = function(path) {
    REPO_PATH = path;
}

var getRepoPath = function() {
    return REPO_PATH;
}

var _getBlobId = function(name, commitId, callback) {
    readObject(commitId, function(err, commit) {
        readObject(commit.tree, function(err, blobs) {
            callback(err, blobs[name]);
        });
    });
}

var _diff = function(name, a, b, type, callback) {
    switch(type) {
        case 'unified':
            callback(null, jsdiff.createPatch(name, a, b));
            break;
        case 'json':
        default:
            callback(null, jsdiff.diffLines(a, b));
    }
}

/**
 * Get the difference between the pages in two reivisions.
 *
 * The `type` value may be a single string such as "json"
 * or an array such as `["json", "unified", "bool"]`.
 *
 * * `json`: json
 * * `unified`: unified diff
 * * `bool`: true if the two pages are identical, false if not.
 *
 * The return value may be a single string if `type` is
 * also single string, or an Object if given `type` is an array.
 *
 * Examples:
 *      a = "289e51ec91fe50c5502383efd435ee1166fc3001";
 *      b = "44ba23b69a70768a3a71f4a29975f1b4b74a12d8";
 *
 *      diff = gitfs.diff('frontpage', a, b, 'json');
 *      diffs = gitfs.diff('frontpage', a, b, ['json', 'unified']);
 *
 * @param {String} name
 * @param {String} a
 * @param {String} b
 * @param {String|Array} type(s)
 * @return {String|Object}
 * @api public
 */
var diff = function(name, a, b, types_, callback) {
    var types = (types_ instanceof Array) ? types_ : [types_];
    var results = {};

    async.forEach(types,
        function (type, cb) {
            switch(type) {
                case 'bool':
                    _getBlobId(name, a, function(err, blobA) {
                        _getBlobId(name, b, function(err, blobB) {
                            results[type] = (blobA == blobB);
                            cb();
                        });
                    });
                    break;
                case 'unified':
                case 'json':
                default:
                    show(name, a, function(err, contentA) {
                        show(name, b, function(err, contentB) {
                            _diff(name, contentA.toString(), contentB.toString(), type, function(err, diff) {
                                results[type] = diff;
                                cb();
                            });
                        });
                    });
            }
        },
        function (err) {
            if (types_ instanceof Array) {
                callback(err, results);
            } else {
                callback(err, _.values(results)[0]);
            }
        }
    );
}

exports._serializeCommit = _serializeCommit;
exports._serializeTree = _serializeTree;
exports._serializeBlob = _serializeBlob;
exports._storeObject = _storeObject;
exports._createObjectBucket = _createObjectBucket;
exports._hash = _hash;

exports.add = add;
exports.status = status;
exports.getHeadTree = getHeadTree;
exports.getHeadCommit = getHeadCommit;
exports.init = init;
exports.commit = commit;
exports.readObject = readObject;
exports.show = show;
exports.log = log;
exports.queryLog = queryLog;
exports.setRepoPath = setRepoPath;
exports.getRepoPath = getRepoPath;
exports.diff = diff;
exports.getCommitIdFromHEAD = getCommitIdFromHEAD;
exports.createCommitFromTree = createCommitFromTree;
