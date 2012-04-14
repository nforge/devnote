#!/usr/bin/env jake

var spawn = require('child_process').spawn;

task('test', function() {
	var proc = spawn('./node_modules/.bin/mocha', ['-t','5000', '-R', 'spec', '-u', 'tdd', '--compilers', 'coffee:coffee-script'], { customFds: [0, 1, 2] });
    proc.on('exit', process.exit);
});

task('start', function() {
    require('./app.js');
});
