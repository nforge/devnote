var gitfs = require('./gitfs');

function init(callback) {
    gitfs.init(callback);
}

function writePage(name, content, callback) {
    var files = {};

    files[name] = content;

    var commit = {
        files: files,
        author: {name: 'Guest', mail: 'guest@n4wiki.com', timezone: '+0900'},
        committer: {name: 'Guest', mail: 'guest@n4wiki.com', timezone: '+0900'},
        message: 'Edit ' + name
    };

    gitfs.commit(commit, callback);
}

function getPage(name, callback) {
    gitfs.show(name, callback);
}

function deletePage(name, callback){
    var err;
    gitfs.show(name);
    callback(err, name);
}

exports.deletePage = deletePage;
exports.writePage = writePage;
exports.getPage = getPage;
exports.init = init;