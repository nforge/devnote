var fs = require('fs');
var path = require('path');

var PATH_SEPERATOR = PATH_SEPERATOR || (process.platform == 'win32' ? '\\' : '/');

var mkdir_p = function(_path, func) {
    var base = '';
    var paths_to_create = [];
    if (!path.normalize(_path).split(PATH_SEPERATOR).every(function (pathSegment) {
        base = path.join(base, pathSegment);
        if (!path.existsSync(base)) {
            paths_to_create.push(base);
            return true;
        }
        return fs.statSync(base).isDirectory();
    })) {
        return false;
    }

    paths_to_create.forEach(function (pathSegment) { 
        fs.mkdirSync(pathSegment); 
    });
}

var rm_rf = function(_path, func) {
    if (!path.existsSync(_path)) {
        return;
    }

    if (fs.statSync(_path).isDirectory()) {
        var filenames = fs.readdirSync(_path);
        filenames.forEach(function (filename) {
            rm_rf(path.join(_path, filename));
        });
        fs.rmdirSync(_path);
    } else {
        fs.unlinkSync(_path);
    }
}

exports.mkdir_p = mkdir_p;
exports.rm_rf = rm_rf;
