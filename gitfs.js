var fs = require('fs');
var async = require('async');
var crypto = require('crypto');
var zlib = require('zlib');
var path = require('path');
var _ = require('underscore');

var init = function(callback) {
    fs.mkdir('pages.git', function(err) {
        if (err) {
            if (err.code == 'EEXIST') {
                callback(new Error("pages.git already exists"));
            } else {
                throw err;
            }
        } else {
            async.parallel([
                async.apply(async.map, ['pages.git/objects', 'pages.git/refs'],fs.mkdir),
                async.apply(fs.writeFile, 'pages.git/HEAD','ref: refs/heads/master'),
            ], callback
            );
        }
    });
}

var createBlob = function(content) {
    return 'blob ' + content.length + '\0' + content;
}

var sha1sum = function(data) {
    return crypto.createHash('sha1').update(data, 'binary').digest('hex');
}

var createObjectBucket = function(digest, callback) {
    var bucketPath = 'pages.git/objects/' + digest.substr(0,2);
    fs.mkdir(bucketPath, function(err) {
        callback(err, bucketPath);
    });
}

var _getTreeContentLength = function(tree) {
    var length = 0;
    var SHA1SUM_DIGEST_BINARY_LENGTH = 20;
    var MODE_LENGTH = '100644'.length;

    _.each(tree, function(blobId, blobName) {
       length += MODE_LENGTH + ' '.length + blobName.length + '\0'.length + SHA1SUM_DIGEST_BINARY_LENGTH;
    });

    return length;
}

var createTree = function (tree) {
    var offset = 0;
    var SHA1SUM_DIGEST_BINARY_LENGTH = 20;
    var length = _getTreeContentLength(tree);
    var header = "tree " + length + "\0";
    var content = new Buffer(length + header.length);
    content.write(header);
    offset += header.length;
    _.each(tree, function(blobId, blobName) {
        var entry = "100644 "+blobName+"\0";
        content.write(entry, offset);
        offset += entry.length;
        content.write(blobId, offset, SHA1SUM_DIGEST_BINARY_LENGTH, 'hex');
        offset += SHA1SUM_DIGEST_BINARY_LENGTH;
    });

    return content;
}

var storeObject = function(raw, callback) {
    var digest = this.sha1sum(raw);
    var self = this;
    zlib.deflate(raw, function(err, result) {
        var deflatedObject = result;
        self.createObjectBucket(digest, function(err, bucketPath) {
            if (err) throw err;
            var objectPath = path.join(bucketPath, digest.substr(2));
            fs.writeFile(objectPath, deflatedObject, function (err) {
                callback(err, digest);
            });
        });
    });
}

var getParentId = function (callback) {
    if(path.existsSync('pages.git/HEAD')) {
        var data = fs.readFileSync('pages.git/HEAD');
        var ref = path.join('pages.git/', data.toString().substr(5));
        if (path.existsSync(ref)) {
            var id = fs.readFileSync(ref);
            callback(null, id);
        } else {
            callback(new Error(ref + ' is not exists'));
        }

    } else {
        callback(new Error('HEAD is not exitsts'));
    }
}

var getTree = function () {
    var sha1sum = '635a6d85573c97658e6cd4511067f2e4f3fe48cb';
    return sha1sum;
}

var createCommit = function (commit) {
    var raw = 'tree ' + commit.tree +'\n';
        raw += 'parent ' + commit.parent + '\n';
        raw += 'author ' + commit.author + '\n';
        raw += 'committer ' + commit.committer + '\n\n';
        raw += commit.message;
    return 'commit ' + raw.length + '\0' + raw;
}

var commit = function(commit, callback) {
    var tree = {}
    var gitfs = this;
    var commitId;
    async.series([
        function(cb) {
            async.forEach(_.keys(commit.files), function(filename, cb2) {
                gitfs.storeObject(gitfs.createBlob(commit.files[filename]), function(err, sha1sum) {
                    tree[filename] = sha1sum;
                    cb2(err);
                });
            }, function(err) { if (err) throw err; cb(null); });
        },
        function(cb) {
            gitfs.storeObject(gitfs.createTree(tree), function(err, sha1sum) {
                gitfs.getParentId(function(err, parentId) {
                    var unixtime = Math.round(new Date().getTime() / 1000);
                    var commitData = {
                        tree: sha1sum,
                        parent: parentId,
                        author: commit.author.name + ' <' + commit.author.mail + '> ' + unixtime + ' ' + commit.author.timezone,
                        committer: commit.committer.name + ' <' + commit.committer.mail + '> ' + unixtime + ' ' + commit.committer.timezone,
                        message: commit.message
                    }
                    gitfs.storeObject(gitfs.createCommit(commitData), function(err, sha1sum) {
                        commitId = sha1sum;
                        cb(err);
                    });
                });
            });
        }
    ], function(err) { callback(err, commitId); } );
}

var getObjectPath = function(id) {
    return path.join('pages.git', 'objects', id.substr(0, 2), id.substr(2));
}

var parseCommitBody = function(buffer) {
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
        // author Yi, EungJun <semtlenori@gmail.com> 1333091842 +0900
        // \____/ \_________________________________________________/
        //   |                            |
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

var parseTreeBody = function(buffer) {
    // tree = {
    //     <filename>: <sha1sum>,
    //     ...
    // }
    var tree = {};
    for (var i = 0; i < buffer.length; i++) {
        if (buffer.readInt8(i) == 0) {
            var filename = buffer.toString('utf8', 0, i).split(' ')[1];
            var sha1sum = buffer.slice(i + 1, i + 1 + 20).toString('hex');
            tree[filename] = sha1sum;
            buffer = buffer.slice(i + 1 + 20);
        }
    }
    return tree;
}

var readObject = function(id, callback) {
    zlib.inflate(fs.readFileSync(getObjectPath(id)), function(err, result) {
        var header = result.toString().split('\0', 1)[0];
        var body = result.slice(header.length + 1);
        var headerFields = header.split(' ');
        var type = headerFields[0];
        var length = headerFields[1];
        var object;
        if (type == 'commit') {
                object = parseCommitBody(body);
        } else if (type == 'tree') {
                object = parseTreeBody(body);
        } else {
                object = body;
        }
        callback(err, object);
    });
}

exports.init = init;
exports.createBlob = createBlob;
exports.sha1sum = sha1sum;
exports.createObjectBucket = createObjectBucket;
exports.createTree = createTree;
exports.getParentId = getParentId;
exports.storeObject = storeObject;
exports.getTree = getTree;
exports.createCommit = createCommit;
exports.commit = commit;
exports.readObject = readObject;
