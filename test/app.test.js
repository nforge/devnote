var Browser = require('zombie');
var assert = require('assert');
var app = require('../app');

var ZOMBIE_TEST_ON_WINDOWS = ZOMBIE_TEST_ON_WINDOWS || (process.platform == 'win32' ? true : false);

!ZOMBIE_TEST_ON_WINDOWS && suite('웹 인터페이스', function() {
    test('새 페이지 등록하기 - /wikis/note/new', function(done) {
        var browser = new Browser();
        browser.visit('http://localhost:3000/wikis/note/new', function() {
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
        browser.visit('http://localhost:3000/wikis/note/new', function() {
        browser.
            fill('name', 'FrontPage').
            fill('body', 'Welcome to n4wiki!').
            pressButton('submit', function() {
                browser.visit('http://localhost:3000/wikis/note/pages/FrontPage', function() {
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
        browser.visit('http://localhost:3000/wikis/note/new', function() {
        browser.
            fill('name', 'FrontPage').
            fill('body', 'Welcome to n4wiki!').
            pressButton('submit', function() {
                browser.visit('http://localhost:3000/wikis/note/edit/FrontPage', function() {
                    browser.
                        fill('name', 'FrontPage').
                        fill('body', 'n4wiki updated!').
                        pressButton('submit', function() {
                            browser.visit('http://localhost:3000/wikis/note/pages/FrontPage', function() {
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
    test('등록한 페이지 삭제하기 - /wikis/note/edit/:name', function (done) {
        var browser = new Browser();
        browser.visit('http://localhost:3000/wikis/note/new', function () {
            browser.
                fill('name', 'FrontPage').
                fill('body', 'Welcome to n4wiki!').
                pressButton('submit', function () {
                    browser.visit('http://localhost:3000/wikis/note/FrontPage', function () {
                            pressButton('delete', function () {
                                Browser.visit("http://localhost:3000/wikis/note/pages/FrontPage", { debug: true, runScripts: false },
                                    function (e, browser, status) {
                                        assert.equal(status, 404);
                                        done();
                                    });
                            });
                    });
                });
        });
    });
});
