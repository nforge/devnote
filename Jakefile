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
    if ( process.platform !== 'win32' ){
        var proc = exec('npm install zombie');
        proc.on('exit', function(){
            console.log('end~~~~~~~~~~~~')
            jake.Task['test'].invoke();
            process.exit();
        });
        proc.stdout.on('data', function(data){
        console.log(data);
        })
        proc.stderr.on('data', function(data){
            console.log(data)
        })
    }
}, true);

task('test', function() {
    if( process.platform === 'win32' ) {
        jake.Task['testWin'].invoke();
    } else{
        jake.Task['testAll'].invoke();
    }
});

task('start', function() {
    require('./app.js');
});

desc("mocha test - process run style")
task('testAll', function(){
    var proc = exec('mocha -t 5000 -R spec -u tdd --compilers coffee:coffee-script');
    proc.on('exit', process.exit);
    proc.stdout.on('data', function(data){
        console.log(data);
    })
    proc.stderr.on('data', function(data){
        console.log(data)
    })
}, {async: true})

desc("mocha test in *nix os - run with node")
task('testnix', function(){
    var options = {}; 
    options.timeout = 5000;
    var mocha = new Mocha(options);
    mocha.reporter('spec').ui('tdd');

    var files = fs.readdirSync('./test')
    for(var i=0, length = files.length; i< length; i += 1){
        if ( files[i].lastIndexOf('test') !== -1 ) {
            mocha.addFile('./test/'+files[i]);
        }
    }

    var runner = mocha.run(function(){
      console.log('finished');
    });

    runner.on('pass', function(test){
    });

    runner.on('fail', function(test){
    });
})

desc("mocha test in windows - run with node")
task('testWin', function(){
    var mocha = new Mocha;
    mocha.reporter('spec').ui('tdd');

    var files = fs.readdirSync('./test')
    for(var i=0, length = files.length; i< length; i += 1){
        //Excluded CoffeeScipt bacause zombie doesn't work in windows
        if ( files[i].lastIndexOf('test') !== -1 && files[i].lastIndexOf('coffee') === -1) {
            mocha.addFile('./test/'+files[i]);
        }
    }

    var runner = mocha.run(function(){
      console.log('finished');
    });

    runner.on('pass', function(test){
    });

    runner.on('fail', function(test){
    });
})