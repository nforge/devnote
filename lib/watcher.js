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
        for(var idx in files){
            fs.stat(path.join(dirname, files[idx] ), function(err, stat){
                if (err) throw err;
                filelist[files.shift()] = stat.mtime;
                if( files.length == 0){
                    callback(filelist);
                }
            })
        }
    })
}

var findModifiedFilesFrom = function(prevFiles, dirname, callback){
    getFiles(dirname, function(currFiles){
        var modifiedFiles = [];
        var prevKeys = Object.keys(prevFiles);

        for(var idx in prevKeys){
            var filename = prevKeys[idx];
            if( prevFiles[filename].getTime() !=  currFiles[filename].getTime()){
                modifiedFiles.push(filename);
            } 
            delete currFiles[filename];
        }
        modifiedFiles = modifiedFiles.concat(Object.keys(currFiles));
        callback(modifiedFiles);
    })
}

exports.findModifiedFilesFrom = findModifiedFilesFrom;
exports.getTotalFileNumber = getTotalFileNumber;
exports.getFiles = getFiles;
exports.getFilenameList = getFilenameList;