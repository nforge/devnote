#!/usr/bin/env jake

var spawn = require('child_process').spawn;
var exec  = require('child_process').exec;

task('test', function() {
	var proc = spawn('mocha', ['-t','5000', '-R', 'spec', '-u', 'tdd'], { customFds: [0, 1, 2] });
    proc.on('exit', process.exit);
});

task('start', function() {
    require('./app.js');
});

task('testAll', function(){
    var exec = exec('mocha -t 5000 -R spec -u tdd --compilers coffee:coffee-script')
})