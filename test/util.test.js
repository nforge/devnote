var libpath = process.env['LIB_COV'] ? '../lib-cov' : '../lib';
var assert = require('assert');
var util = require('../lib/util');

suite('util.convertOffsetToTimezone', function() {
  test('', function(done) {
    assert.equal(util.convertOffsetToTimezone(-540), '+0900');
    assert.equal(util.convertOffsetToTimezone(+120), '-0200');
    assert.equal(util.convertOffsetToTimezone(0), '+0000');
    done();
  });
});

suite('util.parseTimezone', function() {
  test('', function(done) {
    assert.deepEqual(util.parseTimezone('+0900'), {
      sign: '+',
      hour: '09',
      min: '00'
    });

    assert.deepEqual(util.parseTimezone('-02:00'), {
      sign: '-',
      hour: '02',
      min: '00'
    });

    assert.throws(
      function() {
        util.parseTimezone('+09000')
      },
      /invalid timezone/
    );

    done();
  });
});
