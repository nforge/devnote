var fs = require('fs');
var async = require('async');
var crypto = require('crypto');
var zlib = require('zlib');
var path = require('path');

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

var createBlobRaw = function(content) {
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

var createBlob = function(content, callback) {
    this.createObject(this.createBlobRaw(content), callback);
}

var createTreeRaw = function (blobs) {
    var length = 0;
    var offset = 0;
    var SHA1SUM_DIGEST_BINARY_LENGTH = 20;
    var MODE_LENGTH = '100644'.length;
    blobs.forEach(function(blob) {
       length += MODE_LENGTH + ' '.length + blob.name.length + '\0'.length + SHA1SUM_DIGEST_BINARY_LENGTH;
    })
    var header = "tree " + length + "\0";
    var content = new Buffer(length + header.length);
    content.write(header);
    offset += header.length;
    blobs.forEach(function(blob) {
        var entry = "100644 "+blob.name+"\0";
        content.write(entry, offset);
        offset += entry.length;
        content.write(blob.sha1sum, offset, SHA1SUM_DIGEST_BINARY_LENGTH, 'binary');
        offset += SHA1SUM_DIGEST_BINARY_LENGTH;
    })

    return content;
}

var createObject = function(raw, callback) {
    var digest = this.sha1sum(raw);
    var self = this;
    zlib.deflate(raw, function(err, result) {
        var deflatedObject = result;
        self.createObjectBucket(digest, function(err, bucketPath) {
            if (err) throw err;
            var treePath = path.join(bucketPath, digest.substr(2));
            fs.writeFile(treePath, deflatedObject, callback);
        });
    });
}

var createTree = function (blobs, callback) {
    this.createObject(this.createTreeRaw(blobs), callback);
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

var createCommitRaw = function (commit) {
    var raw = 'tree ' + commit.tree +'\n';
        raw += 'parent ' + commit.parent + '\n';
        raw += 'author ' + commit.author + '\n';
        raw += 'committer ' + commit.committer + '\n\n';
        raw += commit.logMessage;
    return 'commit ' + raw.length + '\0' + raw;
}

var createCommit = function(commit, callback) {
    this.createObject(this.createCommitRaw(commit), callback);
}

var replaceTreeContents = function(targetTree, targetBlob){
    var clone = _cloneJSON(targetTree);

    for(var idx in clone.content){
        if( (clone.content[idx]).name === targetBlob.name ) {
            clone.content[idx] = targetBlob;
        }
    };

    return clone;
}

_cloneJSON = function(target){
    return JSON.parse( JSON.stringify(target) );
}

exports.replaceTreeContents = replaceTreeContents;
exports.init = init;
exports.createBlobRaw = createBlobRaw;
exports.sha1sum = sha1sum;
exports.createObjectBucket = createObjectBucket;
exports.createBlob = createBlob;
exports.createTreeRaw = createTreeRaw;
exports.getParentId = getParentId;
exports.createTree = createTree;
exports.createObject = createObject;
exports.getTree = getTree;
exports.createCommitRaw = createCommitRaw;
exports.createCommit = createCommit;
