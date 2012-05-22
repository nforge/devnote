fs = require 'fs'
wiki = require './lib/wiki'
url = require 'url'
debug = (require 'debug')('main')
assert = require 'assert'
mailer = require './lib/mailer'
User = require('./lib/users').User
_ = require 'underscore'

ROOT_PATH = '/wikis/'

lastVisits = {}
subscribers = {}

exports.init = (wikiname) ->
    ROOT_PATH += wikiname
    wiki.init wikiname, (err) ->
        console.log err.message if err
        data = fs.readFileSync 'frontpage.md'
        wiki.writePage 'frontpage', data, (err) ->
            throw err if err

error404 = (err, req, res, next) ->
    res.statusCode = 404
    res.render '404.jade',
    title: "404 Not Found",
    error: err.message,

error500 = (err, req, res, next) ->
    res.statusCode = 500
    res.render '500.jade',
    title: "Sorry, Error Occurred...",
    error: err.message,

history = (name, req, res) ->
    LIMIT = 30
    handler = (err, commits) ->
        if err
            error404 err, req, res
        else
            res.render 'history',
                title: name,
                commits: commits,
                limit: LIMIT,
    if req.query.until
        offset = parseInt(req.query.offset or 0)
        wiki.queryHistory
            filename: name,
            until: req.query.until,
            offset: offset,
            limit: LIMIT,
            handler
    else
        wiki.getHistory name, LIMIT, handler

diff = (name, req, res) ->
    wiki.diff name, [req.query.a, req.query.b], (err, diff) ->
        if err
            error404 err, req, res
        else
            res.render 'diff',
                title: 'Diff',
                name: name,
                diff: wiki.renderDiff(diff),


search = (req, res) ->
    keyword = req.query.keyword
    if not keyword
        res.render 'search',
            title: 'Search'
            pages: {}
    else
        wiki.search keyword, (err, pages) ->
            throw err if err
            res.render 'search',
                title: 'Search'
                pages: wiki.renderSearch(pages)

exports.getPages = (req, res) ->
    switch req.query.action
        when 'search' then search req, res
        else list req, res

# get wikipage list
list = (req, res) ->
    wiki.getPages (err, pages) ->
        if err
            error404 err, req, res
        else
            res.render 'pages',
                title: 'Pages',
                content: pages

exports.getPage = (req, res) ->
    name = req.params.name
    switch req.query.action
        when 'diff' then diff name, req, res
        when 'history' then history name, req, res
        when 'edit' then edit name, req, res
        else view name, req, res

edit = (name, req, res) ->
    wiki.getPage name, (err, page) ->
        if err
            error404 err, req, res
        else
            res.render 'edit',
                title: 'Edit Page',
                name: name,
                content: page.content

commandUrls = (name) ->
    view: ROOT_PATH + '/pages/' + name,
    new: ROOT_PATH + '/new',
    edit: url.format
        pathname: ROOT_PATH + '/pages/' + name,
        query:
            action: 'edit',
    history: url.format
        pathname: ROOT_PATH + '/pages/' + name,
        query:
            action: 'history',
    delete: url.format
        pathname: ROOT_PATH + '/pages/' + name,
    subscribe: url.format
        pathname: ROOT_PATH + '/subscribes/' + name,

view = (name, req, res) ->
    wiki.getPage name, req.query.rev, (err, page) ->
        if err then return error404 err, req, res
        subscribed = req.session.user and subscribers[name] and req.session.user.id in subscribers[name]
        renderPage = (lastVisit) ->
            options =
                title: name
                content: (wiki.render page.content)
                commit: page.commit
                commitId: page.commitId
                isOld: page.isOld
                subscribed: subscribed
                loggedIn: !!req.session.user
                urls: commandUrls name

            if lastVisit
                options.urls.diffSinceLastVisit = url.format
                    pathname: ROOT_PATH + '/pages/' + name,
                    query:
                        action: 'diff',
                        a: lastVisit.id,
                        b: page.commitId,
                options.lastVisitDate = lastVisit.date

            res.render 'page', options

        if not req.session.user
            return renderPage()

        userId = req.session.user.id

        if not lastVisits[userId]
            lastVisits[userId] = {}

        lastVisitId = lastVisits[userId][name]
        lastVisits[userId][name] = page.commitId

        if not lastVisitId
            return renderPage()

        if lastVisitId != page.commitId
            # something changed
            wiki.readCommit lastVisitId,
                (err, commit) ->
                    lastVisit =
                        date: new Date commit.committer.unixtime * 1000
                        id: lastVisitId,
                    renderPage lastVisit
        else
            # nothing changed
            renderPage()

exports.getNew = (req, res) ->
    res.render 'new', title: 'New Page', pageName: '__new_' + new Date().getTime(), filelist: []

exports.postNew = (req, res) ->
    name = req.body.name
    wiki.writePage name, req.body.body, (err, commitId) ->
        if req.session.user
            userId = req.session.user.id
            if not lastVisits[userId]
                lastVisits[userId] = {}
            lastVisits[userId][name] = commitId

        if subscribers[name]
            # send mail to subscribers of this page.
            wiki.diff name, commitId, ['json', 'unified'], (err, diff) ->
                user = req.session.user

                subject = '[n4wiki] ' + name + ' was edited'
                subject += (' by ' + user.id) if user

                if user
                    ids = _.without(subscribers[name], user.id)
                else
                    ids = subscribers[name]
                
                to = (User.findUserById(id).email for id in ids)

                mailer.send
                    to: to
                    subject: subject
                    text: diff['unified']
                    html: wiki.renderDiff(diff['json'], true)

        res.redirect ROOT_PATH + '/pages/' + name

exports.postDelete = (req, res) ->
    wiki.deletePage req.params.name, (err) ->
        res.render 'deleted',
            title: req.body.name,
            message: req.params.name,
            content: 'Page deleted',

exports.postRollback = (req, res) ->
    name = req.params.name
    wiki.rollback name, req.body.id, (err) ->
        wiki.getHistory name, (err, commits) ->
            if err
                error404 err, req, res
            else
                res.contentType 'json'
                res.send {commits: commits, name: name, ids: commits.ids}

exports.postSubscribe = (req, res) ->
    name = req.params.name
    if req.session.user
        subscribers[name] = [] if not subscribers[name]
        userId = req.session.user.id
        if not (userId in subscribers[name])
            subscribers[name].push userId

    res.redirect ROOT_PATH + '/pages/' + name

exports.postUnsubscribe = (req, res) ->
    name = req.params.name
    if req.session.user and subscribers[name]
        subscribers[name] = _.without subscribers[name], req.session.user.id

    res.redirect ROOT_PATH + '/pages/' + name
