var fs = require('fs');
var async = require('async');
var crypto = require('crypto');
var zlib = require('zlib');
var path = require('path');
var assert = require('assert');
var _ = require('underscore');
var packutil = require('./packutil');

var NUL = '\0';
var REPO_PATH = 'pages.git';

var OBJ_NONE = 0;
var OBJ_COMMIT = 1;
var OBJ_TREE = 2;
var OBJ_BLOB = 3;
var OBJ_TAG = 4;
var OBJ_OFS_DELTA = 6;
var OBJ_REF_DELTA = 7;

var packs = {};

var init = function(callback) {
    fs.mkdir(REPO_PATH, function(err) {
        if (err) {
            if (err.code == 'EEXIST') {
                callback(new Error("pages.git already exists"));
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

var _getTreeContentLength = function(tree) {
    var result = 0;
    var SHA1SUM_DIGEST_BINARY_LENGTH = 20;
    var MODE_LENGTH = '100644'.length;

    _.each(tree, function(blobId, blobName) {
       result += MODE_LENGTH + ' '.length + blobName.length + NUL.length + SHA1SUM_DIGEST_BINARY_LENGTH;
    });
    return result;
}

var _serializeTree = function (tree) {
    var SHA1SUM_DIGEST_BINARY_LENGTH = 20;
    var length = _getTreeContentLength(tree);
    var header = "tree " + length + "\0";
    var content = new Buffer(length + header.length);
    var buffer = content;

    buffer.write(header);
    buffer = buffer.slice(header.length);

    _.each(tree, function(blobId, blobName) {
        var entry = "100644 "+blobName+"\0";
        buffer.write(entry);
        buffer = buffer.slice(entry.length);
        buffer.write(blobId, 0, SHA1SUM_DIGEST_BINARY_LENGTH, 'hex');
        buffer = buffer.slice(SHA1SUM_DIGEST_BINARY_LENGTH);
    });

    return content;
}

var _storeObject = function(serialized, callback) {
    var id = this._hash(serialized);
    var self = this;
    zlib.deflate(serialized, function (err, deflatedObject) {
        self._createObjectBucket(id, function(err, bucketPath) {
            var objectPath = path.join(bucketPath, id.substr(2));
            fs.writeFile(objectPath, deflatedObject, function (err) {
                callback(err, id);
            });
        });
    });
}


var _getCommitIdFromHEAD = function (callback) {

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
    return 'commit ' + raw.length + NUL + raw;
}

var _storeFiles = function(files, callback){
    var gitfs = this;
    var tree = {};
    async.forEach(_.keys(files), function (filename, cb) {
        gitfs._storeObject(gitfs._serializeBlob(files[filename]), function (err, id) {
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
var _createCommitFromTree = function(commitData, tree, callback) {
    var gitfs = this;
    gitfs._storeObject(gitfs._serializeTree(tree), function(err, id) {
        commitData.tree = id;
        gitfs._storeObject(gitfs._serializeCommit(commitData), function(err, id) {
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
 * parentID를 이용해 현재 tree가 참조하는 부모 tree 객체를 얻어온다.
 *
 * @param callback (err, tree)
 */
var _getParentTree = function(parentId, tree, callback) {
    var gitfs = this;  // ?
    gitfs.readObject(parentId, function(err, parentCommit) {
        gitfs.readObject(parentCommit.tree, function(err, parentTree) {
            var newTree = _.extend(parentTree, tree);
            callback(null, newTree);
        });
    });
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
    var gitfs = this;
    var commitData = _prepareCommitData(request);

    async.series({
        storeFiles: function(cb) {
           gitfs._storeFiles(request.files, function(err, data){
               tree = data;
               cb(err);
           });
        },
        commit: function(cb) {
            gitfs._getCommitIdFromHEAD(function(err, parentId) {
                if (parentId) {
                    commitData.parent = parentId;
                    gitfs._getParentTree(parentId, tree, function(err, parentTree) {
                        gitfs._createCommitFromTree(commitData, parentTree, cb);
                    });
                } else {
                    gitfs._createCommitFromTree(commitData, tree, cb);
                }
            });
        }
    }, function(err, result) { callback(err, result.commit); } ); // _createCommitFromTree의 cb결과
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

// read a git object from packed objects.'tag':
var _readObjectFromPack = function(id, callback) {
    fs.readdir(path.join(REPO_PATH, 'objects/pack'), function(err, files) {
        async.forEachSeries(
            files,
            function(file, next) {
                var matched = file.match(/pack-([0-9abcdef]{40}).idx/)
                if (!matched) {
                    next();
                }

                var packId = matched[1];
                var pack = packs[packId];

                var __read = function() {
                    pack.getObject(id, function(err, type, body) {
                        if (body) {
                            callback(null, _parseObject(type, body));
                            next('break');
                        } else {
                            next();
                        }
                    });
                }

                if (pack) {
                    __read();
                } else {
                    pack = new packutil.Pack();
                    pack.init(REPO_PATH, packId, function(err) {
                        packs[packId] = pack;
                        __read();
                    });
                }
            },
            function(err) {
                if (err != 'break') {
                    callback(new Error("Object '" + id + "' does not exist."));
                }
            }
        );
    });
}

// read a git object from loose objects.
var _readObjectFromLoose = function(id, callback) {
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
        }[headerFields[0]]
        callback(err, _parseObject(type, body));
    });
}

var readObject = function(id, callback) {
    if (!id) {
        throw new Error("object id is empty: " + id);
    }
    if (id.toString().length > 40) {
        throw new Error("id.length > 40");
    }
    if (path.existsSync(_getObjectPath(id))) {
        _readObjectFromLoose(id, callback);
    } else {
        _readObjectFromPack(id, callback);
    }
}

var show = function(filename, commitId, callback) {
    var gitfs = this;

    gitfs.readObject(commitId, function(err, commit) {
        if (err) throw err;
        gitfs.readObject(commit.tree, function(err, tree) {
            if (tree[filename]) {
                gitfs.readObject(tree[filename], function(err, content) {
                    callback(err, content);
                });
            } else {
                callback(new Error("'" + filename + "' not found in the commit " + commitId));
            }
        });
    });
}

/**
 * 어떤 파일에 대해서 특정 commit 이후부터의 로그를 찾는다.
 *
 * @param filename
 * @param from 검색을 시작할 commit id 값
 * @param callback commit 목록
 */
var queryLog = function(query, callback) {
    var gitfs = this;
    var logQuery = {
        filename: query.filename,
        limit: query.limit,
    };

    if (query.offset < 0) {
        gitfs._getCommitIdFromHEAD(function(err, head) {
            gitfs._queryLog({
                filename: query.filename,
                until: head,
                since: query.until
            }, null, function(err, commits) {
                var index = commits.ids.length + query.offset;
                if (index < 0) {
                    index = 0;
                }
                logQuery.until = commits.ids[index];
                gitfs._queryLog(logQuery, null, callback);
            });
        });
    } else if (query.offset > 0) {
        gitfs._queryLog({
            filename: query.filename,
            until: query.until,
            limit: query.offset + 1
        }, null, function(err, commits) {
            logQuery.until = commits.ids[query.offset];
            gitfs._queryLog(logQuery, null, callback);
        });
    } else if (query.until) {
        gitfs._queryLog(query, null, callback);
    } else {
        gitfs._getCommitIdFromHEAD(function(err, head) {
            query.until = head;
            gitfs._queryLog(query, null, callback);
        });
    }
}

/**
 * 어떤 파일에 대해서 특정 commit 이후부터의 로그를 찾는다.
 * 실제로 변경이 있었던 커밋만 로그에 포함시키기 위해, blob id 가 바뀌었는지 검사한다.
 *
 * @param filename
 * @param from 검색을 시작할 commit id 값
 * @param previousBlobId 이전 blob id 값
 * @param callback commit 목록
 * @private
 */
var _queryLog = function(query, previousBlobId, callback) {
    var gitfs = this;
    var nextLimit = query.limit;
    // filename, from, until, limit,
    if (query.limit === 0 || query.until == query.since) {
        var empty = [];
        empty.ids = [];
        callback(null, empty);
        return;
    }

    this.readObject(query.until, function(err, commit) {
        if (err) { callback(err); return; }
        assert.ok(commit.tree);
        gitfs.readObject(commit.tree, function(err, tree) {
            if (err) { callback(err); return; }

            var commits = [];

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

            if (commit.parent) {
                gitfs._queryLog({filename: query.filename, until: commit.parent, since: query.since, limit: nextLimit}, previousBlobId, function(err, nextCommits) {
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
    var gitfs = this;

    this._getCommitIdFromHEAD(function(err, id) {
        gitfs._queryLog({filename: filename, until: id, limit: limit}, null, callback);
    });
}

/**
 * Head Commit의 tree 객체를 콜백으로 넘긴다.
 * @param callback (err, tree)
 */
var getHeadTree = function(callback){
    var gitfs = this;
    gitfs._getCommitIdFromHEAD(function (err, id) {
        gitfs.readObject(id, function (err, commit) {
            gitfs.readObject(commit.tree, function(err, tree) {
                callback(err, tree);
            });
        });
    });
}

var getHeadCommit = function (callback) {
    var gitfs = this;
    gitfs._getCommitIdFromHEAD(function (err, id) {
        if (err) throw err;
        gitfs.readObject(id, function(err, commit){
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

exports.add = add;
exports.status = status;
exports.getHeadTree = getHeadTree;
exports.getHeadCommit = getHeadCommit;
exports._storeFiles = _storeFiles;
exports._getCommitIdFromHEAD = _getCommitIdFromHEAD;
exports.init = init;
exports._serializeBlob = _serializeBlob;
exports._hash = _hash;
exports._createObjectBucket = _createObjectBucket;
exports._serializeTree = _serializeTree;
exports._storeObject = _storeObject;
exports._createCommitFromTree = _createCommitFromTree;
exports._serializeCommit = _serializeCommit;
exports.commit = commit;
exports.readObject = readObject;
exports.show = show;
exports.log = log;
exports._queryLog = _queryLog;
exports.queryLog = queryLog;
exports.setRepoPath = setRepoPath;
exports.getRepoPath = getRepoPath;
exports._getParentTree = _getParentTree;