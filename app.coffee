util = require 'util'

###
Module dependencies.
###

express = require 'express'
routes  = require './routes'
wiki    = require './lib/wiki'

wikiApp = require './wikiApp'
userApp = require './userApp'
fileApp = require './fileApp'

noop = ->
process.env.uploadDir = uploadDir = __dirname + '/public/attachment'

app = module.exports = express.createServer()

# Configuration
app.set 'views', __dirname + '/views'
app.set 'view engine', 'jade'

app.configure ->
  app.use express.bodyParser 
    uploadDir: uploadDir
  app.use express.cookieParser 'n4wiki session'
  app.use express.session()   
  app.use express.methodOverride()
  app.use app.router
  app.use express.static __dirname + '/public'
  app.use express.logger 'dev'

# Session-persisted message middleware
app.locals.use (req, res) ->
  err = req.session.error
  msg = req.session.success
  # delete req.session.error
  # delete req.session.success
  res.locals.message = ''
  if err
     res.locals.message = err
  if msg
     res.locals.message = msg

app.configure 'development', ->
  app.use express.errorHandler
      dumpExceptions: true,
      showStack: true,

app.configure 'production', ->
  app.use express.errorHandler()

# Routes
app.get '/', routes.index

# Wiki
app.get  '/wikis/note/pages', wikiApp.getPages          # get page list
app.get  '/wikis/note/pages/:name', wikiApp.getPage     # get a page
app.get  '/wikis/note/new', wikiApp.getNew              # get a form to post new wikipage
app.post '/wikis/note/pages', wikiApp.postNew           # post new wikipage
app.post '/wikis/note/delete/:name', wikiApp.postDelete # delete wikipage
app.post '/api/note/pages/:name', wikiApp.postRollback  # wikipage rollback

# Login & Logout
app.post '/wikis/note/users/login', userApp.postLogin   # post login

# User
app.get  '/wikis/note/users', userApp.getUsers          # get user list
app.get  '/wikis/note/users/new', userApp.getNew        # new user page
app.post '/wikis/note/users/new', userApp.postNew       # post new user
app.get  '/wikis/note/user/:id', userApp.getId          # show user information
app.post '/wikis/note/user/:id', userApp.postId         # change user information (password change)
app.post '/wikis/note/dropuser', userApp.postDropuser   # drop user

# attachment
app.get  '/wikis/note/pages/:name/attachment', fileApp.getAttachment             # file attachment page
app.get  '/wikis/note/pages/:name/attachment.:format', fileApp.getAttachmentList # file attachment list call by json
app.post '/wikis/note/pages/:name/attachment.:format?', fileApp.postAttachment   # file attachment 
app.del  '/wikis/note/pages/:name/attachment/:filename', fileApp.delAttachment   # attachment file delete

# wiki init on start
wiki.init (err) ->
    console.log err.message if err 
    wiki.writePage 'frontpage', 'welcome to n4wiki', (err) ->
        throw err if err

if not module.parent
    wiki.init noop
    LISTEN_PORT = 3000
    app.listen LISTEN_PORT;
    console.log "Express server listening on port %d in %s mode", LISTEN_PORT, app.settings.env

exports.stop = -> app.close