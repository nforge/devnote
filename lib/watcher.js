var fs = require('fs');
var path = require('path');
var util = require('util');

var getTotalFileNumber = function(dirname, callback){
    fs.readdir(dirname, function(err, files){
        callback(files.length);
    })
}

var getFilenameList = function(dirname, callback){
    fs.readdir(dirname, function(err, files){
        callback(files);
    })
}

var getFiles = function(dirname, callback){
    getFilenameList(dirname, function(files){
        var filelist = {};
        var counter = Object.keys(files).length;
        for(var idx = 0, length = files.length; idx<length; idx++){
            var stat = fs.statSync(path.join(dirname, files[idx]));
            filelist[files.shift()] = stat.mtime;
            counter--;
            if( counter == 0){
                console.log(filelist);
                callback(filelist);
            }
        }
    })
}

var findModifiedFilesFrom = function(prevFiles, dirname, callback){
    getFiles(dirname, function(currFiles){
        for(var filename in prevFiles){
            if( prevFiles[filename].getTime() ==  currFiles[filename].getTime()){
                console.log("filename >>> " + filename);
                delete currFiles[filename];
            }
        }
        callback(Object.keys(currFiles));
    })
}

exports.findModifiedFilesFrom = findModifiedFilesFrom;
exports.getTotalFileNumber = getTotalFileNumber;
exports.getFiles = getFiles;
exports.getFilenameList = getFilenameList;