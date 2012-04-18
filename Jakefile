#!/usr/bin/env jake

var spawn = require('child_process').spawn;
var exec  = require('child_process').exec;
var Mocha = require('mocha');

task('default', function (params) {
  console.log('This is the default task.');
});

task('test', function() {
	var proc = spawn('mocha', ['-t','5000', '-R', 'spec', '-u', 'tdd'], { customFds: [0, 1, 2] });
    proc.on('exit', process.exit);
});

task('start', function() {
    require('./app.js');
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