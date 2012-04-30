util = require 'util'
fs = require 'fs'

###
Module dependencies.
###

express = require 'express'
routes = require './routes'
wiki = require './lib/wiki'
user = require('./lib/users').users
path = require 'path'

app = express.createServer()

# Configuration

process.env.uploadDir = uploadDir = __dirname + '/public/attachment'

app.configure ->
  app.set 'views', __dirname + '/views'
  app.set 'view engine', 'jade'
  app.use express.bodyParser 
    uploadDir: uploadDir
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
app.get '/wikis/note/pages/:name/attachment', routes.attachment

error404 = (err, req, res, next) ->
    res.render '404.jade',
    title: "404 Not Found",
    error: err.message,
    status: 404,

view = (name, req, res) ->
    wiki.getPage name, (err, content) ->
        if err
            error404 err, req, res
        else
            res.render 'page',
                title: name,
                content: wiki.render content,

edit = (name, req, res) ->
    wiki.getPage name, (err, content) ->
        if err
            error404 err, req, res
        else
            res.render 'edit',
                title: 'Edit Page',
                name: name,
                content: content,

history = (name, req, res) ->
    wiki.getHistory name, (err, commits) ->
        if err
            error404 err, req, res
        else
            res.render 'history',
                title: name,
                commits: commits,

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

# get wikipage list
list = (req, res) ->
    wiki.getPages (err, pages) ->
        if err
            error404 err, req, res
        else
            res.render 'pages',
                title: 'Pages',
                content: pages

app.get '/wikis/note/pages', (req, res) ->
    switch req.query.action
        when 'search' then search req, res
        else list req, res

app.get '/wikis/note/pages/:name', (req, res) ->
    name = req.params.name
    switch req.query.action
        when 'diff' then diff name, req, res
        when 'history' then history name, req, res
        when 'edit' then edit name, req, res
        else view name, req, res

# get a form to post new wikipage
app.get '/wikis/note/new', (req, res) ->
    res.render 'new', title: 'New Page'

# rollback
app.post '/api/note/pages/:name', (req, res) ->
    name = req.params.name
    wiki.rollback name, req.body.id, (err) ->
        wiki.getHistory name, (err, commits) ->
            if err
                error404 err, req, res
            else
                res.contentType 'json'
                res.send {commits: commits, name: name, ids: commits.ids}

# post new wikipage
app.post '/wikis/note/pages', (req, res) ->
    name = req.body.name
    wiki.writePage name, req.body.body, (err) ->
        res.redirect '/wikis/note/pages/' + name

# delete wikipage
app.post '/wikis/note/delete/:name', (req, res) ->
    wiki.deletePage req.params.name, (err) ->
        res.render 'deleted',
            title: req.body.name,
            message: req.params.name,
            content: 'Page deleted',

# get user
app.get '/wikis/note/users', (req, res) ->
    switch req.query.action
        when 'login' then login req, res
        else users req, res

login = (req, res) ->
    res.render 'user/login'
        title: 'login'
        content: 'login'

# get userlist
users = (req, res) ->
    userlist = user.findAll()
    res.render 'user/userlist',
        title: 'User List',
        content: "등록된 사용자 " + Object.keys(userlist).length + "명",
        userlist: userlist

# get new user
app.get '/wikis/note/users/new', (req, res) ->
    res.render 'user/new'
        title: 'new user'

# post new user
app.post '/wikis/note/users/new', (req, res) ->
    user.add
        id: req.body.id,
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
    userInfo = user.findUserById req.body.id

    res.render 'user/user',
        title: '사용자가 등록되었습니다.',
        content: "사용자 정보",
        userInfo: userInfo

# show user information
app.get '/wikis/note/user/:id', (req, res) ->
    userInfo = user.findUserById req.params.id
    res.render 'user/edit',
        title: 'User information',
        content: "사용자 정보",
        user: userInfo

# change user information (password change)
app.post '/wikis/note/user/:id', (req, res) ->
    targetUser = user.findUserById req.params.id
    isValid = user.changePassword req.body.previousPassword, req.body.newPassword, targetUser
    targetUser.email = req.body.email if isValid
    user.save targetUser if isValid

    userInfo = user.findUserById req.params.id
    res.render 'user/user',
        title: '사용자 정보가 변경되었습니다.',
        content: "사용자 정보",
        userInfo: userInfo    


# drop user
app.post '/wikis/note/dropuser', (req, res) ->
    user = user.findUserById req.body.id
    user.remove({id: req.body.id}) if user
    res.redirect '/wikis/note/userlist'

# file attachment 
app.post '/wikis/note/pages/:name/attachment', (req, res) ->
    localUploadPath = path.dirname(req.files.attachment.path) + "/" + req.params.name
    fs.mkdir localUploadPath, (err) ->
        throw err if err && err.code != 'EEXIST'
        fs.rename req.files.attachment.path, localUploadPath + '/' + req.files.attachment.name,  (err) ->
            return if req.files.attachment.name isnt on
            throw err if err
    res.redirect '/wikis/note/pages/' + req.params.name + '/attachment'

# attachment file delete
app.del '/wikis/note/pages/:name/attachment/:filename', (req, res) ->
    filePath = path.join(uploadDir, req.params.name, req.params.filename)
    fs.unlink filePath, (err) ->
        throw err if err
    res.redirect '/wikis/note/pages/' + req.params.name + '/attachment'    


exports.start = (port, callback) ->
    wiki.init (err) ->
        wiki.writePage 'frontpage', 'welcome to n4wiki', (err) ->
          app.listen port, null, (err) ->
            throw err if err
            console.log "Express server listening on port %d in %s mode", app.address().port, app.settings.env
            callback() if callback


exports.stop = -> app.close

exports.start 3000 if not module.parent
