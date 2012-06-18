var assert = require('assert');
var async = require('async');
var step = require('step');
var fileutils = require('../lib/delta');
var fs = require('fs');
var zlib = require('zlib');
var path = require('path');
var packutil = require('../lib/packutil');
var gitfs = require('../lib/gitfs');

// TODO: test REF_DELTA

suite('pack.getObjectIds', function(){
    var packId = 'a0e60bd1c3e0b983d3fced8c46fe85758ee52eac';
    var gitRoot = 'test/resources/pack.git_fixture';

    test('object id를 가져온다.', function(done) {
        var pack = new packutil.Pack();
        pack.init(gitRoot, packId, function(err) {
            if (err) throw err;
            assert.equal(pack.getObjectIds().length, 90);
            done();
        });
    });
});

suite('pack.getObject', function() {
    var packId;
    var gitRoot;
    var pack;

    setup(function(done) {
        packId = 'a0e60bd1c3e0b983d3fced8c46fe85758ee52eac';
        gitRoot = 'test/resources/pack.git_fixture';
        pack = new packutil.Pack();
        pack.init(gitRoot, packId, function(err) {
            if (err) throw err;
            done();
        });
    });

    test('object id로 object 1개를 가져온다.', function(done) {
        var expected, id;

        step(
            function given() {
                expected = '1\n2\n3\n';
                id = pack.getObjectIds()[0];
                this();
            },
            function when() {
                pack.getObject(id, this);
            },
            function then(err, type, actual) {
                if (err) throw err;
                assert.equal(actual.toString(), expected);
                done();
            }
        );
    });

    test('delta compression 된 object 1개를 가져온다.', function(done) {
        var expected, id;

        step(
            function given() {
                expected = '1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n';
                id = pack.getObjectIds()[8];
                this();
            },
            function when() {
                pack.getObject(id, this);
            },
            function then(err, type, actual) {
                if (err) throw err;
                assert.equal(actual.toString(), expected);
                done();
            }
        );
    });

    test('존재하지 않는 object를 가져오려 시도하면 에러가 발생한다.', function(done) {
        var expected;

        step(
            function given() {
                expected = "Object 'aaa' does not exist.";
                this();
            },
            function when() {
                pack.getObject('aaa', this);
            },
            function then(err) {
                assert.equal(err.message, expected);
                done();
            }
        );
    });
});
