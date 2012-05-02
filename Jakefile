#!/usr/bin/env jake
var spawn = require('child_process').spawn;
var exec  = require('child_process').exec;
var Mocha = require('mocha');
var fs = require('fs');
var util = require('util');
var async = require('async');

task('default', function (params) {
  console.log('This is the default task.');
});

var cp_async = function(src, dst, callback) {
    var is = fs.createReadStream(src);
    var os = fs.createWriteStream(dst);
    util.pump(is, os, callback);
}

task('build', function() {
    async.parallel([
        async.apply(
            cp_async,
            'node_modules/hljs/highlight.js',
            'public/scripts/highlight.js'),
        async.apply(
            cp_async, 
            'node_modules/github-flavored-markdown/scripts/showdown.js',
            'public/scripts/showdown.js'),
        async.apply(
            cp_async, 
            'lib/highlight-c.js',
            'public/scripts/highlight-c.js'),
    ], complete);
}, true);

task('test', function() {
    var proc = spawn('mocha', ['-t','5000', '-R', 'spec', '-u', 'tdd', '--compilers', 'coffee:coffee-script'], { customFds: [0, 1, 2] });
    proc.on('exit', process.exit);
});

desc("mocha test - process run style")
task('testAll', function(){
    var proc = exec('mocha -t 5000 -R spec -u tdd');
    proc.on('exit', process.exit);
    proc.stdout.on('data', function(data){
        console.log(data);
    })
    proc.stderr.on('data', function(data){
        console.log(data)
    })
}, {async: true})


desc("mocha test - run with node")
task('testSomething', function(){
    var mocha = new Mocha;
    mocha.reporter('spec').ui('tdd');

    mocha.addFile('test/users.test.js');

    var runner = mocha.run(function(){
      console.log('finished');
    });

    runner.on('pass', function(test){
      console.log('... %s passed', test.title);
    });

    runner.on('fail', function(test){
      console.log('... %s failed', test.title);
    });
})
