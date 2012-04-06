var fu = require('../fileutils');
var path = require('path');
var assert = require('assert');
var step = require('step');

suite('fileutils.cp_r', function() {
    test('폴더 복사하기',function() {
        step(
           function given(){
               fu.mkdir_p('AA/BB')
               fu.writeFileSync('AA/BB/READYOU', 'READ YOUR SELF!');
           },
           function when(){
               fu.cp_r('AA', 'CC', this);
           },
           function then(err) {
               if (err) throw err;
               assert.ok(path.existsSync('CC'));
           }
        )
    })
})
