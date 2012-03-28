var fs = require('fs');
var async = require('async');

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

exports.init = init;
exports.createBlob = createBlob;