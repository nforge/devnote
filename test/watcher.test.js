var watcher = require('../lib/watcher')
var assert = require('assert')
var fs = require('fs');
var step = require('step');

suite("file changed detect", function(){
    var testDir = __dirname +"/resources/aa/";
    setup(function(done){
        fs.unlink(testDir+'hello', function(err){
            done();
        });
    })
    test("getTotalFileNumber", function(done){
        watcher.getTotalFileNumber(testDir, function(size){
            assert.equal(size, 2);
            done();
        })
    })
    test("getFilenameList", function(done){
        watcher.getFilenameList(testDir, function(files){
            assert.equal(files.length, 2);
            done();
        })
    })
    // file = {
    //     README : mtime,
    //      ...
    // }
    test("getFiles", function(done){
        watcher.getFiles(testDir, function(files){
            assert.equal(Object.keys(files).toString(), "package.json,README");
            done();
        })
    })
    test("findModifiedFiles: existing file modified", function(done){  //ToDo: 때때로 테스트가 깨짐
        // file = {
        //     README : mtime,
        //      ...
        // }
        var prevFiles = {};

        step(
            function given(){
                watcher.getFiles(testDir, this);        
            },
            function when(files){
                prevFiles = files;
                fs.writeFileSync(testDir+'README','some contents');
                watcher.findModifiedFilesFrom(prevFiles, testDir, this);
            },
            function then(modifiedFileName){
                assert.equal(modifiedFileName.toString(), "README");
                done();
            }
            );
    })
    
    test("findModifiedFiles: new file added", function(done){
        // file = {
        //     README : mtime,
        //      ...
        // }
        var prevFiles = {};

        step(
            function given(){
                watcher.getFiles(testDir, this);
            },
            function when(files){
                prevFiles = files;
                fs.writeFileSync(testDir+'hello','some contents');
                watcher.findModifiedFilesFrom(prevFiles, testDir, this);
            },
            function then(modifiedFileName){
                assert.equal(modifiedFileName.toString(), "hello");
                done();
            }
            );
    })
})
