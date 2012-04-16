util = require 'util'

###
Module dependencies.
###

express = require 'express'
routes = require './routes'
wiki = require './lib/wiki'

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

# rollback
app.post '/wikis/note/rollback/:name', (req, res) ->
    wiki.rollback req.body.name, req.body.id, (err) ->
        wiki.getHistory req.body.name, (err, commits) ->
            if err
                error404 err, req, res
            else
                res.render 'history',
                    title: req.body.name,
                    commits: commits,

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

exports.start = (port, callback) ->
    wiki.init (err) ->
        app.listen port
        console.log "Express server listening on port %d in %s mode", app.address().port, app.settings.env
        callback() if callback

exports.stop = -> app.close

exports.start 3000 if not module.parent
