util = require 'util'

###
Module dependencies.
###

express = require 'express'
routes = require './routes'
wiki = require './lib/wiki'

app = express.createServer()

session = {}
# Configuration

app.set 'views', __dirname + '/views'
app.set 'view engine', 'jade'

process.env.uploadDir = uploadDir = __dirname + '/public/attachment'

app.configure ->
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
        wiki.queryHistory {filename: name, until: req.query.until, offset: offset, limit: LIMIT}, handler
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

wikiApp = require('./wikiApp')
userApp = require('./userApp')
fileApp = require('./fileApp')

#########################################################
# get page list
app.get '/wikis/note/pages', wikiApp.getPages

# get a page
app.get '/wikis/note/pages/:name', wikiApp.getPage

# get a form to post new wikipage
app.get '/wikis/note/new', wikiApp.getNew

# rollback
app.post '/api/note/pages/:name', wikiApp.postRollback

# post new wikipage
app.post '/wikis/note/pages', wikiApp.postNew

# delete wikipage
app.post '/wikis/note/delete/:name', wikiApp.postDelete

#########################################################
# get user
app.get '/wikis/note/users', userApp.getUsers

# post login
app.post '/wikis/note/users/login', userApp.postLogin

# get new user
app.get '/wikis/note/users/new', userApp.getNew

# post new user
app.post '/wikis/note/users/new', userApp.postNew

# show user information
app.get '/wikis/note/user/:id', userApp.getId

# change user information (password change)
app.post '/wikis/note/user/:id', userApp.postId

# drop user
app.post '/wikis/note/dropuser', userApp.postDropuser

#########################################################
# file attachment page
app.get '/wikis/note/pages/:name/attachment', fileApp.getAttachment

# file attachment list call by json
app.get '/wikis/note/pages/:name/attachment.:format', fileApp.getAttachmentList

# file attachment 
app.post '/wikis/note/pages/:name/attachment.:format?', fileApp.postAttachment   

# attachment file delete
app.del '/wikis/note/pages/:name/attachment/:filename', fileApp.delAttachment

#########################################################
exports.start = (port, callback) ->
    wiki.init (err) ->
        wiki.writePage 'frontpage', 'welcome to n4wiki', (err) ->
          app.listen port, null, (err) ->
            throw err if err
            console.log "Express server listening on port %d in %s mode", port, app.settings.env
            callback() if callback

exports.stop = -> app.close

exports.start 3000 if not module.parent
