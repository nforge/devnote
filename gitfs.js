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
    var sha1sum = crypto.createHash('sha1');
    sha1sum.update(data);
    return sha1sum.digest('hex');
}

var deflate = function(buffer, callback) {
    zlib.deflateRaw(buffer, callback);    
}

var createBlobBucket = function(digest, callback) {
    var bucketPath = 'pages.git/objects/' + digest.substr(0,2);
    fs.mkdir(bucketPath, function(err) {
        callback(err, bucketPath);
    });
}

var createBlob = function(content, callback) {
    var raw = this.createBlobRaw(content);
    var digest = this.sha1sum(raw);
    var self = this;
    this.deflate(raw, function(err, result) {
        var deflatedBlob = result;
        self.createBlobBucket(digest, function(err, bucketPath) {
            if (err) throw err;
            console.log(bucketPath);
            console.log(path.existsSync(bucketPath));
            fs.writeFile(path.join(bucketPath, digest.substr(2)), deflatedBlob, callback);
        });
    });
}

var createTreeRaw = function (blobs) {
    var content = new Buffer(((7+5+1+20)*2)+5+2+1);
    var length = 0;
    var offset = 0;
    blobs.forEach(function(blob) {
       length += 7+blob.name.length+1+20;
    })
    var header = "tree " + length + "\0";
    content.write(header);
    offset += header.length;
    blobs.forEach(function(blob) {
        var entry = "100644 "+blob.name+"\0";
        content.write(entry);
        offset += entry.length;
        var buffer = new Buffer(blob.sha1sum,'binary');
        buffer.copy(content, offset);
        offset += buffer.length;
    })

    return content;
}

var getParentId = function () {

}

exports.init = init;
exports.createBlobRaw = createBlobRaw;
exports.sha1sum = sha1sum;
exports.deflate = deflate;
exports.createBlobBucket = createBlobBucket;
exports.createBlob = createBlob;
exports.createTreeRaw = createTreeRaw;
exports.getParentId = getParentId;
