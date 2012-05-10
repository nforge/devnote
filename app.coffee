util = require 'util'

###
Module dependencies.
###

express = require 'express'
routes  = require './routes'

wikiApp = require './wikiApp'
userApp = require './userApp'
fileApp = require './fileApp'

noop = ->
process.env.uploadDir = uploadDir = __dirname + '/public/attachment'
WIKINAME = 'note'
ROOT_PATH = '/wikis/' + WIKINAME

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
app.get  ROOT_PATH+'/pages', wikiApp.getPages          # get page list
app.get  ROOT_PATH+'/pages/:name', wikiApp.getPage     # get a page
app.get  ROOT_PATH+'/new', wikiApp.getNew              # get a form to post new wikipage
app.post ROOT_PATH+'/pages', wikiApp.postNew           # post new wikipage
app.post ROOT_PATH+'/delete/:name', wikiApp.postDelete # delete wikipage
app.post '/api/note/pages/:name', wikiApp.postRollback  # wikipage rollback

# Login & Logout
app.post ROOT_PATH+'/users/login', userApp.postLogin   # post login

# User
app.get  ROOT_PATH+'/users', userApp.getUsers          # get user list
app.get  ROOT_PATH+'/users/new', userApp.getNew        # new user page
app.post ROOT_PATH+'/users/new', userApp.postNew       # post new user
app.get  ROOT_PATH+'/user/:id', userApp.getId          # show user information
app.post ROOT_PATH+'/user/:id', userApp.postId         # change user information (password change)
app.post ROOT_PATH+'/dropuser', userApp.postDropuser   # drop user

# attachment
app.get  ROOT_PATH+'/pages/:name/attachment', fileApp.getAttachment             # file attachment page
app.get  ROOT_PATH+'/pages/:name/attachment.:format', fileApp.getAttachmentList # file attachment list call by json
app.post ROOT_PATH+'/pages/:name/attachment.:format?', fileApp.postAttachment   # file attachment 
app.del  ROOT_PATH+'/pages/:name/attachment/:filename', fileApp.delAttachment   # attachment file delete

if not module.parent
    wikiApp.init WIKINAME
    LISTEN_PORT = 3000
    app.listen LISTEN_PORT;
    console.log "Express server listening on port %d in %s mode", LISTEN_PORT, app.settings.env

exports.stop = -> app.close
