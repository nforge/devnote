var assert = require('assert');
var wiki = require('../lib/wiki');
var fileutils = require('../lib/fileutils');

var ZOMBIE_TEST_ON_WINDOWS = ZOMBIE_TEST_ON_WINDOWS || (process.platform == 'win32' ? true : false);

suite('wiki', function() {
    setup(function(done) {
        wiki.init(done);
    });

    test('사용자는 위키 페이지를 등록하고 열람할 수 있다.', function(done) {
        var name = 'SecondPage';
        var content = 'n4wiki details';

        wiki.writePage(name, content, function(err) {
            if (err) throw err;
            wiki.getPage(name, function(err, actual) {
                assert.equal(content, actual);
                done();
            });
        });
    });

    test('사용자는 마크다운 포맷으로 작성된 위키페이지를 렌더링된 HTML 페이지로 볼 수 있다.', function() {
        assert.equal(wiki.render('Welcome to **n4wiki**'), '<p>Welcome to <strong>n4wiki</strong></p>');
    });

    test('사용자는 소스코드가 포함된 위키페이지를 구문강조된 HTML 페이지로 볼 수 있다.', function() {
        var actual = wiki.render("```python\ndef foo():\n  print 'bar'\n```");
        var expected = '<pre>\ndef foo():\n  <span class="keyword">print</span> <span class="string">\'bar\'</span></pre>'
        assert.equal(actual, expected)
    });

    test('사용자는 위키 페이지를 삭제할 수 있다.', function(done){
        var name = 'my diary';
        var content = 'It\'s a very busy today';

        wiki.writePage(name, content, function (err) {
            if (err) throw err;
            wiki.deletePage(name, function (err, tree) {
                if (err) throw err;
                assert.deepEqual(tree[name], undefined);
                done();
            });
        });
    });

    teardown(function(done) {
        fileutils.rm_rf('pages.git');
        done();
    });
});

