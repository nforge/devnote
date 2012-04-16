var assert = require('assert');
var wiki = require('../lib/wiki');
var fileutils = require('../lib/fileutils');

var ZOMBIE_TEST_ON_WINDOWS = ZOMBIE_TEST_ON_WINDOWS || (process.platform == 'win32' ? true : false);

suite('wiki', function() {
    setup(function(done) {
        wiki.init(function (err) {
            wiki.writePage('frontpage', 'welcome to n4wiki', function (err) {
                if (err) throw err;
                done();
            });
        });
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
        var expected = '<pre><code class="python">\n<span class="function"><span class="keyword">def</span> <span class="title">foo</span><span class="params">()</span>:</span>\n  <span class="keyword">print</span> <span class="string">\'bar\'</span></code></pre>'
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

    test('사용자는 모든 위키 페이지 목록을 볼 수 있다.', function(done){
        wiki.getPages(function (err, pages) {
            if (err) throw err;
            assert.equal(pages.length, 1);
            assert.equal(pages[0], 'frontpage');
            done();
        });
    });

    test('rollback', function(done) {
        var name = 'SecondPage';
        var content = 'hello';

        wiki.writePage(name, content, function(err) {
            if (err) throw err;
            var content = 'hello, world';
            wiki.writePage(name, content, function(err) {
                if (err) throw err;
                wiki.getHistory(name, function(err, commits) {
                    wiki.rollback(name, Object.keys(commits)[1], function(err) {
                        wiki.getPage(name, function(err, actual) {
                            assert.equal('hello', actual);
                            done();
                        });
                    });
                });
            });
        });
    });

    teardown(function(done) {
        fileutils.rm_rf('pages.git');
        done();
    });
});

