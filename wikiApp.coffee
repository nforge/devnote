wiki = require './lib/wiki'

error404 = (err, req, res, next) ->
    res.render '404.jade',
    title: "404 Not Found",
    error: err.message,
    status: 404

error500 = (err, req, res, next) ->
    res.render '500.jade',
    title: "Sorry, Error Occurred...",
    error: err.message,
    status: 500

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
    wiki.diff name, req.query.a, req.query.b, (err, diff) ->
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
    wiki.getPage name, (err, content) ->
        if err
            error404 err, req, res
        else
            res.render 'edit',
                title: 'Edit Page',
                name: name,
                content: content

view = (name, req, res) ->
    wiki.getPage name, (err, content) ->
        if err
            error404 err, req, res
        else
            res.render 'page',
                title: name,
                content: wiki.render content,
                
exports.getNew = (req, res) ->
    res.render 'new', title: 'New Page', pageName: '____new_' + new Date().getTime(), filelist: []
        
exports.postNew = (req, res) ->
    name = req.body.name
    wiki.writePage name, req.body.body, (err) ->
        res.redirect '/wikis/note/pages/' + name

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

