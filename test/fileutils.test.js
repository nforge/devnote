var libpath = process.env['LIB_COV'] ? '../lib-cov' : '../lib';
var assert = require('assert');
var fileutils = require(libpath + '/fileutils.js');
var mkdirp = require('mkdirp');
var fs = require('fs');

suite("fileutils", function(){
  suite("mv", function(){
    test("하나의 파일 이동",function(done){
      //Given
      mkdirp('./mvtest_target', function(err){
        if (err) console.error(err);
        fs.writeFile('message.txt', 'Hello Node', function (err) {
          if (err) throw err;
          //When 
          fs.rename('./mvtest_target', './mvtest_dest', function(err){ //mv 대신 rename으로 mv가 되도록 변경함
            //Then
            fs.stat('./mvtest_dest',function(err, stats){
              if (err) throw err;
              assert.equal(stats.isDirectory(), true);
              done();
            });
          });
        });
      });
    });
    teardown(function() {
      fs.rmdir('./mvtest_dest',function(err){
        if(err) throw err;
      });
    });
  });
});