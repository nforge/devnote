var assert = require('assert');
var wiki = require('../lib/wiki');
var fileutils = require('../lib/fileutils');

var ZOMBIE_TEST_ON_WINDOWS = ZOMBIE_TEST_ON_WINDOWS || (process.platform == 'win32' ? true : false);

!ZOMBIE_TEST_ON_WINDOWS && suite('wiki', function() {
    setup(function(done) {
        wiki.init(done);
    });

    test('사용자는 위키 페이지를 등록하고 열람할 수 있다.', function(done) {
        var name = 'FrontPage';
        var content = 'Welcome to n4wiki';

        wiki.writePage(name, content, function(err) {
            if (err) throw err;
            wiki.getPage(name, function(err, actual) {
                assert.equal(content, actual);
                done();
            });
        });
    });

    test('사용자는 위키 페이지를 삭제할 수 있다.', function(done){
        var name = 'my diary';
        var content = 'It\'s a very busy today';

        wiki.writePage(name, content, function (err) {
            if (err) throw err;
            wiki.deletePage(name, function (err, actual) {
                if (err) throw err;
                wiki.getPage(name, function (err, actual) {
                    assert.equal(actual, "");
                    done();
                });
            });
        });
    });

    teardown(function(done) {
        fileutils.rm_rf('pages.git');
        done();
    });
});

