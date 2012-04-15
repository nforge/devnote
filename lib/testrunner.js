var util = require("util");
var fs = require('fs');
var util  = require('util')
var exec = require("child_process").exec;

var testrunner = function(filename, callback){
    fs.watch(filename, function (event, filename) {
      if (event == 'change' ){
        runTest();
      }
      if (filename) {
        console.log('file changed: ' + filename);
      }
    });
}

var runTest = function runTest(prog, execProg, args){
    var that = this;
    defer( function(){
      var child = exec('node ./node_modules/mocha/bin/mocha -R list');
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

testrunner('test')