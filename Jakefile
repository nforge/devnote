#!/usr/bin/env jake
var spawn = require('child_process').spawn;
var exec  = require('child_process').exec;
var Mocha = require('mocha');
var fs = require('fs');
var util = require('util');
var async = require('async');
var path = require('path');

//ansi color set
var red   = '\u001b[31m';
var blue  = '\u001b[34m';
var green = '\u001b[32m';
var reset = '\u001b[0m';
var cp_async = function(src, dst, callback) {
  var stream = fs.createReadStream(src);
  stream.pipe(fs.createWriteStream(dst));
  stream.on("end", function() {
    console.log(src, "is copied to", dst);
  });
}

var cp_r_async = function(src, dst, callback) {
  var self = this;
  fs.stat(src, function(err, stat) {
    if (err) throw err;
    if (stat.isDirectory()) {
      fs.mkdir(dst, function(err) {
        fs.readdir(src, function(err, files) {
          async.forEach(files, function(file, cb) {
            cp_r_async(path.join(src, file), path.join(dst, file), cb);
          }, callback);
        });
      });
    } else {
      cp_async(src, dst, callback);
    }
  });
};

task('default', function (params) {
  console.log('This is the default task.');
});


task('build', function() {
  console.log(green,'Required files are being copied', reset);

  var targetsToCopy = [
    {from: 'node_modules/hljs/highlight.js', to: 'public/scripts/highlight.js'},
    {from: 'node_modules/github-flavored-markdown/scripts/showdown.js', to: 'public/scripts/showdown.js'},
    {from: 'lib/highlight-c.js', to: 'public/scripts/highlight-c.js'},
    {from: 'node_modules/hljs/styles/zenburn.css', to: 'public/stylesheets/zenburn.css'},
    {from: 'lib/i18n.js', to: 'public/scripts/i18n.js'},
    {from: 'lib/sprintf.js', to: 'public/scripts/sprintf.js'},
    {from: 'locales', to: 'public/locales'}
  ];

  targetsToCopy.forEach(function(element, index){
    cp_r_async(element.from, element.to, function(err){
      if (err) throw new Error('copy failed');
    });
  });
  
  if ( process.platform !== 'win32' ){
    var proc;
    fs.stat('node_modules/zombie', function(err, stat) {
      if (err) {
        console.log(green, 'installing zombie test module. please be patient!');
        proc = exec('npm install zombie');

        proc.on('exit', function(){
          console.log(green, '....build end');
          jake.Task['test'].invoke();
        });
        proc.stdout.on('data', function(data){
          console.log(data);
        });
        proc.stderr.on('data', function(data){
          console.log(data)
        });
      } else {
        jake.Task['test'].invoke();
      }
    });
  }
}, true);

task('start', function() {
  // spawn('coffee', ['app.coffee'], {customFds: [0, 1, 2]});
  var proc = exec('coffee app.coffee');
  proc.on('exit', process.exit);
  proc.stdout.pipe(process.stdout, { end: false });
  proc.stderr.pipe(process.stderr, { end: false });
});

task('test', function() {
  if( process.platform === 'win32' ) {
    jake.Task['testWin'].invoke();
  } else{
    jake.Task['testAll'].invoke();
  }
});

desc("mocha test - process run style")
task('testAll', function(){
  // spawn('mocha', ['-t', '5000', '-R', 'spec', '-u', 'tdd', '--compilers', 'coffee:coffee-script'], {customFds: [0, 1, 2]});
  var proc = exec('mocha --colors -t 5000 -R spec -u tdd --compilers coffee:coffee-script');
  proc.on('exit', process.exit);
  proc.stdout.pipe(process.stdout, { end: false });
  proc.stderr.pipe(process.stderr, { end: false });
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
