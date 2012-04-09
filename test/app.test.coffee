Browser = require 'zombie'
assert = require 'assert'
app = require '../app'
url = require 'url'

port = 3000
getUrl = (pathname) -> url.format
    protocol: 'http:',
    hostname: 'localhost',
    port: port,
    pathname: pathname,

suite '웹 인터페이스', ->
    suiteSetup (done) -> app.start port, done

    test '새 페이지 등록하기 - /wikis/note/new', (done) ->
        browser = new Browser
        browser.visit getUrl('/wikis/note/new'), ->
            assert.ok browser.success
            browser.
                fill('name', 'FrontPage').
                fill('body', 'Welcome to n4wiki!').
                pressButton 'submit', ->
                    assert.ok browser.success
                    assert.equal browser.text('h1'), 'FrontPage'
                    assert.equal browser.text('p'), 'Welcome to n4wiki!'
                    done()

    test '등록한 페이지 열어보기 - /wikis/note/pages/:name', (done) ->
        browser = new Browser
        browser.visit getUrl('/wikis/note/new'), ->
            assert.ok browser.success
            browser.
                fill('name', 'FrontPage').
                fill('body', 'Welcome to n4wiki!').
                pressButton 'submit', ->
                    browser.visit getUrl('/wikis/note/pages/FrontPage'), ->
                        assert.ok browser.success
                        assert.equal browser.text('h1'), 'FrontPage'
                        assert.equal browser.text('p'), 'Welcome to n4wiki!'
                        done()

    test '등록한 페이지 편집하기 - /wikis/note/edit/:name', (done) ->
        browser = new Browser
        browser.visit getUrl('/wikis/note/new'), ->
            assert.ok browser.success
            browser.
                fill('name', 'FrontPage').
                fill('body', 'Welcome to n4wiki!').
                pressButton 'submit', ->
                    browser.visit getUrl('/wikis/note/edit/FrontPage'), ->
                        assert.ok browser.success
                        browser.
                            fill('name', 'FrontPage').
                            fill('body', 'n4wiki updated!').
                            pressButton 'submit', ->
                                browser.visit getUrl('/wikis/note/pages/FrontPage'), ->
                                    assert.ok browser.success
                                    assert.equal browser.text('h1'), 'FrontPage'
                                    assert.equal browser.text('p'), 'n4wiki updated!'
                                    done()

    suiteTeardown (done) -> app.stop(); done()
