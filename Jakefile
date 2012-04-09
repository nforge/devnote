#!/usr/bin/env jake

var spawn = require('child_process').spawn;

task('test', function() {
	var proc = spawn('./node_modules/.bin/mocha', ['-R', 'spec', '-u', 'tdd'], { customFds: [0, 1, 2] });
    proc.on('exit', process.exit);
});

task('start', function() {
    require('./app.js');
});
