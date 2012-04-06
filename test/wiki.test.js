var assert = require('assert');
var wiki = require('../wiki');
var fileutils = require('../fileutils');

suite('wiki', function() {
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

    teardown(function(done) {
        fileutils.rm_rf('pages.git');
        done();
    });
});