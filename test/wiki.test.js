var assert = require('assert');
var wiki = require('../lib/wiki');
var fileutils = require('../lib/fileutils');
var step = require('step');
var async = require('async');

var ZOMBIE_TEST_ON_WINDOWS = ZOMBIE_TEST_ON_WINDOWS || (process.platform == 'win32' ? true : false);

var WIKINAME = 'note';

suite('wiki', function() {
    setup(function(done) {
        wiki.init(WIKINAME, function (err) {
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
                assert.equal(content, actual.content);
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
        step(
            function given() {
                wiki.writePage('SecondPage', 'hello', this);
            },
            function when(err) {
                if (err) throw err;
                wiki.getPages(this);
            },
            function then(err, pages) {
                assert.equal(pages.length, 2);
                assert.deepEqual(pages, ['frontpage', 'SecondPage']);
                done();
            }
        );
    });

    test('사용자는 위키 페이지를 특정 시점으로 되돌릴 수 있다.', function(done) {
        var name = 'SecondPage';
        var content = 'hello';

        wiki.writePage(name, content, function(err) {
            if (err) throw err;
            var content = 'hello, world';
            wiki.writePage(name, content, function(err) {
                if (err) throw err;
                wiki.getHistory(name, null, function(err, commits) {
                    wiki.rollback(name, commits.ids[1], function(err) {
                        wiki.getPage(name, function(err, actual) {
                            assert.equal('hello', actual.content);
                            done();
                        });
                    });
                });
            });
        });
    });

    test('사용자는 제목으로 위키 페이지를 검색할 수 있다.', function(done) {
        var name = 'SecondPage';
        var content = 'hello';

        wiki.writePage(name, content, function(err) {
            if (err) throw err;
            wiki.search('SecondPage', function(err, result) {
                assert.equal(Object.keys(result).length, 1);
                assert.equal(Object.keys(result)[0], 'SecondPage');
                done();
            });
        });
    });

    test('사용자는 본문 내용으로 위키 페이지를 검색할 수 있다.', function(done) {
        var name = 'SecondPage';
        var content = 'hello';

        wiki.writePage(name, content, function(err) {
            if (err) throw err;
            wiki.search('ll', function(err, result) {
                assert.equal(Object.keys(result).length, 1);
                var expected = ['ll'];
                expected.index = 2;
                expected.input = 'hello';
                assert.deepEqual(result['SecondPage'], expected);
                done();
            });
        });
    });

    test('사용자는 위키 페이지의 두 시점간 차이를 볼 수 있다.', function(done) {
        var name = 'SecondPage';

        step(
            function given() {
                async.mapSeries(
                    ['hello', 'hello, world'],
                    async.apply(wiki.writePage, name),
                    this
                );
            },
            function when(err) {
                if (err) throw err;
                var next = this;
                wiki.getHistory(name, null, function(err, commits) {
                    wiki.diff(name, commits.ids[1], commits.ids[0], next);
                });
            },
            function then(err, diff) {
                if (err) throw err;
                var expected = [
                    {value: 'hello, world', added: true, removed: undefined},
                    {value: 'hello', added: undefined, removed: true},
                ];
                assert.deepEqual(diff, expected);
                done();
            }
        );
    });

    teardown(function(done) {
        fileutils.rm_rf(WIKINAME + '.pages.git');
        done();
    });
});
