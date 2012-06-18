var fs = require('fs');
var path = require('path');

var PATH_SEPERATOR = PATH_SEPERATOR || (process.platform === 'win32' ? '\\' : '/');

var mkdir_p = function(_path, func) {
  var base, paths_to_create, addPathToCreate;

  base = '';
  paths_to_create = [];

  addPathToCreate = function(pathSegment) {
    base = path.join(base, pathSegment);
    if (!path.existsSync(base)) {
      paths_to_create.push(base);
      return true;
    }
    return fs.statSync(base).isDirectory();
  };

  if (!path.normalize(_path).split(PATH_SEPERATOR).every(addPathToCreate)) {
    return false;
  }

  return paths_to_create.forEach(function(pathSegment) {
    return fs.mkdirSync(pathSegment);
  });
};

var rm_rf = function(_path) {
  var filenames;

  if (!path.existsSync(_path)) {
    return false;
  }

  if (fs.statSync(_path).isDirectory()) {
    filenames = fs.readdirSync(_path);
    filenames.forEach(function(filename) {
      return rm_rf(path.join(_path, filename));
    });
    return fs.rmdirSync(_path);
  }

  return fs.unlinkSync(_path);
};

exports.mkdir_p = mkdir_p;
exports.rm_rf = rm_rf;
