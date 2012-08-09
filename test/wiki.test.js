var libpath = process.env['LIB_COV'] ? '../lib-cov' : '../lib';
var assert = require('assert');
var wiki = require(libpath + '/wiki');
var fileutils = require(libpath + '/fileutils');
var step = require('step');
var async = require('async');
var _ = require('underscore');

var ZOMBIE_TEST_ON_WINDOWS = ZOMBIE_TEST_ON_WINDOWS || (process.platform == 'win32' ? true : false);

var WIKINAME = 'note';

suite('wiki', function() {
  setup(function(done) {
    wiki.init(WIKINAME, function(err) {
      wiki.writePage('frontpage', 'welcome to n4wiki', function(err) {
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

  test('사용자는 위키 페이지를 삭제할 수 있다.', function(done) {
    var name = 'my diary';
    var content = 'It\'s a very busy today';

    wiki.writePage(name, content, function(err) {
      if (err) throw err;
      wiki.deletePage(name, function(err, tree) {
        if (err) throw err;
        assert.deepEqual(tree[name], undefined);
        done();
      });
    });
  });

  test('사용자는 모든 위키 페이지 목록을 볼 수 있다.', function(done) {
    step(function given() {
      wiki.writePage('secondPage', 'hello', this);
    }, function when(err) {
      if (err) throw err;
      wiki.getPages(this);
    }, function then(err, pages) {
      assert.equal(pages.length, 2);
      assert.ok(_.any(pages, function(page) {
        return page.name == 'frontpage';
      }));
      assert.ok(_.any(pages, function(page) {
        return page.name == 'secondPage';
      }));
      done();
    });
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

  test('사용자는 특정 시점의 위키페이지를 볼 수 있다.', function(done) {
    var name = 'SecondPage';

    step(function given() {
      async.mapSeries(['hello', 'hello, world'], async.apply(wiki.writePage, name), this);
    }, function when(err) {
      if (err) throw err;
      var next = this;
      wiki.getHistory(name, null, function(err, commits) {
        if (err) throw err;
        wiki.getPage(name, commits.ids[1], next);
      });
    }, function then(err, page) {
      if (err) throw err;
      assert.equal(page.content, 'hello');
      done();
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

    step(function given() {
      async.mapSeries(['hello', 'hello, world'], async.apply(wiki.writePage, name), this);
    }, function when(err) {
      if (err) throw err;
      var next = this;
      wiki.getHistory(name, null, function(err, commits) {
        wiki.diff(
          {filename: name, rev: commits.ids[1]},
          {filename: name, rev: commits.ids[0]}, next);
      });
    }, function then(err, diff) {
      if (err) throw err;
      var expected = [
        {
        value: 'hello, world',
        added: true,
        removed: undefined
      },
        {
        value: 'hello',
        added: undefined,
        removed: true
      },
        ];
      assert.deepEqual(diff, expected);
      done();
    });
  });

  teardown(function(done) {
    fileutils.rm_rf(wiki.getRepoPath());
    done();
  });
});
