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
            fs.writeFile(objectPath, deflatedObject, callback);
        });
    });
}

var getParentId = function (callback) {
    if(path.existsSync('pages.git/HEAD')) {
        var data = fs.readFileSync('pages.git/HEAD');
        var id = fs.readFileSync(path.join('pages.git/', data.toString().substr(5)));

        callback(null, id);
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
        raw += commit.logMessage;
    return 'commit ' + raw.length + '\0' + raw;
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
