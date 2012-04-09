var fs = require('fs');
var async = require('async');
var crypto = require('crypto');
var zlib = require('zlib');
var path = require('path');
var _ = require('underscore');

var NUL = '\0';
var REPO_PATH = 'pages.git';

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
        // ToDo: data를 assert 하는 코드를 넣어 놓자
        var ref = path.join(REPO_PATH + '/', data.toString().substr(5));
        if (path.existsSync(ref)) {
            var id = fs.readFileSync(ref);
            callback(null, id.toString());
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

var commit = function(request, callback) {
    var tree = {};
    var gitfs = this;
    var unixtime = Math.round(new Date().getTime() / 1000);
    var commitData = {
        author: request.author.name + ' <' + request.author.mail + '> ' + unixtime + ' ' + request.author.timezone,
        committer: request.committer.name + ' <' + request.committer.mail + '> ' + unixtime + ' ' + request.committer.timezone,
        message: request.message
    }

    async.series({
        storeFiles: function(cb) {
           gitfs._storeFiles(request.files, function(err, data){
               tree = data;
               cb(err);
           });
        },
        storeCommit: function(cb) {
            gitfs._getCommitIdFromHEAD(function(err, parentId) {
                if (parentId) {
                    commitData.parent = parentId;
                    gitfs.readObject(parentId, function(err, parentCommit) {
                        gitfs.readObject(parentCommit.tree, function(err, parentTree) {
                            tree = _.extend(parentTree, tree);
                            gitfs._createCommitFromTree(commitData, tree, cb);
                        });
                    });
                } else {
                    gitfs._createCommitFromTree(commitData, tree, cb);
                }
            });
        }
    }, function(err, result) { callback(err, result.storeCommit); } );
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
                    mail: matches[2],
                    unixtime: matches[3],
                    timezone: matches[4],
                }
                break;
        }
    });

    return commit;
}

var _parseTreeBody = function(buffer) {
    // tree = {
    //     <filename>: <id>,
    //     ...
    // }
    var tree = {};
    for (var i = 0; i < buffer.length; i++) {
        if (buffer.readInt8(i) == 0) {
            var filename = buffer.toString('utf8', 0, i).split(' ')[1];
            var id = buffer.slice(i + 1, i + 1 + 20).toString('hex');
            tree[filename] = id;
            buffer = buffer.slice(i + 1 + 20);
            i = 0;
        }
    }
    return tree;
}

var readObject = function(id, callback) {
    if (!id) {
        throw new Error("object id is empty: " + id);
    }
    zlib.inflate(fs.readFileSync(_getObjectPath(id)), function(err, result) {
        var header = result.toString().split(NUL, 1)[0];
        var body = result.slice(header.length + 1);
        var headerFields = header.split(' ');
        var type = headerFields[0];
        var object;
        if (type == 'commit') {
                object = _parseCommitBody(body);
        } else if (type == 'tree') {
                object = _parseTreeBody(body);
        } else {
                object = body;
        }
        callback(err, object);
    });
}

var show = function(filename, callback) {
    var gitfs = this;
    this._getCommitIdFromHEAD(function(err, id) {
        gitfs.readObject(id, function(err, commit) {
            gitfs.readObject(commit.tree, function(err, tree) {
                if (tree[filename]) {
                    gitfs.readObject(tree[filename], function(err, content) {
                        callback(err, content);
                    });
                } else {
                    callback(new Error("'" + filename + "' not found in the commit " + id));
                }
            });
        });
    });
}

var log_from = function(filename, from, previousBlobId, callback) {
    var gitfs = this;

    this.readObject(from, function(err, commit) {
        gitfs.readObject(commit.tree, function(err, tree) {
            var commits;

            if (tree[filename] && previousBlobId != tree[filename]) {
                commits = [commit];
                previousBlobId = tree[filename];
            } else {
                commits = [];
            }

            if (commit.parent) {
                gitfs.log_from(filename, commit.parent, previousBlobId, function(err, nextCommits) {
                    callback(err, commits.concat(nextCommits));
                });
            } else {
                callback(err, commits);
            }
        });
    });
}

var log = function(filename, callback) {
    var gitfs = this;

    this._getCommitIdFromHEAD(function(err, id) {
        gitfs.log_from(filename, id, null, callback);
    });
}

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
exports.log_from = log_from;
