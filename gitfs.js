var fs = require('fs');
var async = require('async');
var crypto = require('crypto');

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
                function(cb) {
                    async.map(['pages.git/objects', 'pages.git/refs'],fs.mkdir, cb);
                },
                function(cb) {
                    fs.writeFile('pages.git/HEAD','ref: refs/heads/master', cb);	
                }
            ], callback
            );
        }
	});
}

var createBlob = function(content) {
    return 'blob ' + content.length + '\0' + content;
}

var sha1sum = function(data) {
    var sha1sum = crypto.createHash('sha1');
    sha1sum.update(data);
    return sha1sum.digest('hex');
}

exports.init = init;
exports.createBlob = createBlob;
exports.sha1sum = sha1sum;