var Browser = require('zombie');
var assert = require('assert');
var app = require('../app');

var port = 3000;

suite('웹 인터페이스', function() {
    suiteSetup(function(done) {
        app.start(port, done);
    });

    test('새 페이지 등록하기 - /wikis/note/new', function(done) {
        var browser = new Browser();
        browser.visit('http://localhost:' + port + '/wikis/note/new', function() {
        assert.ok(browser.success);
        browser.
            fill('name', 'FrontPage').
            fill('body', 'Welcome to n4wiki!').
            pressButton('submit', function() {
                assert.ok(browser.success);
                assert.equal(browser.text('h1'), 'FrontPage');
                assert.equal(browser.text('p'), 'Welcome to n4wiki!');
                done();
            });
        });
    });

    test('등록한 페이지 열어보기 - /wikis/note/pages/:name', function(done) {
        var browser = new Browser();
        browser.visit('http://localhost:' + port + '/wikis/note/new', function() {
        assert.ok(browser.success);
        browser.
            fill('name', 'FrontPage').
            fill('body', 'Welcome to n4wiki!').
            pressButton('submit', function() {
                browser.visit('http://localhost:' + port + '/wikis/note/pages/FrontPage', function() {
                    assert.ok(browser.success);
                    assert.equal(browser.text('h1'), 'FrontPage');
                    assert.equal(browser.text('p'), 'Welcome to n4wiki!');
                    done();
                });
            });
        });
    });

    test('등록한 페이지 편집하기 - /wikis/note/edit/:name', function(done) {
        var browser = new Browser();
        browser.visit('http://localhost:' + port + '/wikis/note/new', function() {
        assert.ok(browser.success);
        browser.
            fill('name', 'FrontPage').
            fill('body', 'Welcome to n4wiki!').
            pressButton('submit', function() {
                browser.visit('http://localhost:' + port + '/wikis/note/edit/FrontPage', function() {
                    assert.ok(browser.success);
                    browser.
                        fill('name', 'FrontPage').
                        fill('body', 'n4wiki updated!').
                        pressButton('submit', function() {
                            browser.visit('http://localhost:' + port + '/wikis/note/pages/FrontPage', function() {
                                assert.ok(browser.success);
                                assert.equal(browser.text('h1'), 'FrontPage');
                                assert.equal(browser.text('p'), 'n4wiki updated!');
                                done();
                            });
                        });
                });
            });
        });
    });

    suiteTeardown(function(done) {
        app.stop();
        done();
    });
});
