util = require 'util'

###
Module dependencies.
###

express = require 'express'
routes = require './routes'
wiki = require './lib/wiki'
users = require('./lib/users').users

app = express.createServer()

# Configuration

app.configure ->
  app.set 'views', __dirname + '/views'
  app.set 'view engine', 'jade'
  app.use express.bodyParser()
  app.use express.methodOverride()
  app.use app.router
  app.use express.static __dirname + '/public'

app.configure 'development', ->
  app.use express.errorHandler
      dumpExceptions: true,
      showStack: true,

app.configure 'production', ->
  app.use express.errorHandler()

# Routes
app.get '/', routes.index
app.get '/wikis/note/users', routes.addUserForm

error404 = (err, req, res, next) ->
    res.render '404.jade',
    title: "404 Not Found",
    error: err.message,
    status: 404,

# get a wikipage
app.get '/wikis/note/pages/:name', (req, res) ->
    wiki.getPage req.params.name, (err, content) ->
        if err
            error404 err, req, res
        else
            res.render 'page',
                title: req.params.name,
                content: wiki.render content,

# get wikipage list
app.get '/wikis/note/pages', (req, res) ->
    wiki.getPages (err, pages) ->
        if err
            error404 err, req, res
        else
            res.render 'pages',
                title: 'Pages',
                content: pages

# get a form to post new wikipage
app.get '/wikis/note/new', (req, res) ->
    res.render 'new', title: 'New Page'

# get a form to edit a wikipage
app.get '/wikis/note/edit/:name', (req, res) ->
    wiki.getPage req.params.name, (err, content) ->
        if err
            error404 err, req, res
        else
            res.render 'edit',
                title: 'Edit Page',
                name: req.params.name,
                content: content,

# get the history of the given wikipage
app.get '/wikis/note/history/:name', (req, res) ->
    wiki.getHistory req.params.name, (err, commits) ->
        if err
            error404 err, req, res
        else
            res.render 'history',
                title: req.params.name,
                commits: commits,

# get the diff between given revisions
app.get '/wikis/note/diff/:name', (req, res) ->
    wiki.diff req.params.name, req.query.a, req.query.b, (err, diff) ->
        res.render 'diff',
            title: 'Diff',
            name: req.params.name,
            diff: wiki.renderDiff(diff),

# rollback
app.post '/wikis/note/rollback/:name', (req, res) ->
    wiki.rollback req.params.name, req.body.id, (err) ->
        wiki.getHistory req.params.name, (err, commits) ->
            if err
                error404 err, req, res
            else
                res.contentType 'json'
                res.send {commits: commits, name: req.params.name, ids: commits.ids}

# post new wikipage
app.post '/wikis/note/pages', (req, res) ->
    wiki.writePage req.body.name, req.body.body, (err) ->
        wiki.getPage req.body.name, (err, content) ->
            res.render 'page',
                title: req.body.name,
                content: wiki.render content,

# delete wikipage
app.post '/wikis/note/delete/:name', (req, res) ->
    wiki.deletePage req.params.name, (err) ->
        res.render 'deleted',
            title: req.body.name,
            message: req.params.name,
            content: 'Page deleted',

# post new user
app.post '/wikis/note/users', (req, res) ->
    users.add 
        id: req.body.id,
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
    user = users.findUserById req.body.id
    res.render 'user/user',
        title: '사용자가 등록되었습니다.',
        content: "사용자 정보",
        user: user

# get user
app.get '/wikis/note/users/:id', (req, res) ->
    user = users.findUserById req.params.id
    res.render 'user/user',
        title: 'User Info',
        content: "사용자 정보",
        user: user

# get userlist
app.get '/wikis/note/userlist', (req, res) ->
    userlist = users.findAll()
    res.render 'user/userlist',
        title: 'User List',
        content: "등록된 사용자 " + Object.keys(userlist).length + "명",
        userlist: userlist

# drop user
app.post '/wikis/note/dropuser', (req, res) ->
    user = users.findUserById req.body.id
    users.remove({id: req.body.id}) if user
    res.redirect '/wikis/note/userlist'

exports.start = (port, callback) ->
    wiki.init (err) ->
        wiki.writePage 'frontpage', 'welcome to n4wiki', (err) ->
          app.listen port, null, (err) ->
            throw err if err
            console.log "Express server listening on port %d in %s mode", app.address().port, app.settings.env
            callback() if callback

exports.stop = -> app.close

exports.start 3000 if not module.parent
