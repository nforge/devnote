var util = require("util");
var fs = require('fs');
var util  = require('util')
var exec = require("child_process").exec;
var isWindows = process.platform === 'win32';

var testrunner = function(filename, callback){
    console.log('Test monitoring at ' + filename)
    watchGivenFile(filename, 1);
}

function runWin (event) {
  console.log('event:' + event);
  if( event === 'change' )
    runTest();
}

function runOther (oldStat, newStat) {
  console.log(JSON.stringify(oldStat));
  if ( newStat.atime.getTime() !== oldStat.atime.getTime() )
    runTest();
}

function watchGivenFile (watch, poll_interval) {
  if (isWindows) {
    fs.watch(watch, { persistent: true, interval: poll_interval }, runWin);
  } else {
    fs.watchFile(watch, { persistent: true, interval: poll_interval }, runOther);
  }
}

var runTest = function runTest(prog, execProg, args){
    var that = this;
    defer( function(){
      var child = exec('node ./node_modules/mocha/bin/mocha -R dot');
      child.stdout.addListener("data", function (chunk) { 
        util.print( chunk );
      });
      child.stderr.addListener("data", function (chunk) { 
        console.error( chunk.toString() );
      });
    }, 250);
}

/**
* reason for windows bug which is triggerd event twice when changed event called
*/
var deferTime;
var defer = function(callback, timeout){
  if (deferTime === undefined){
    setTimeout(callback, timeout);
    setTimeout(function(){
      deferTime = undefined;
    }, timeout);
    deferTime = Math.round((new Date()).getTime() / 1000);
    return;
  }
  var now = Math.round((new Date()).getTime() / 1000);
  var timeoutId = setTimeout(callback, timeout);
  if ( now < deferTime + timeout ){
    clearTimeout(timeoutId)
  }
}

testrunner('./test/')