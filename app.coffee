util = require 'util'

###
Module dependencies.
###

express = require 'express'
routes  = require './routes'

wikiApp = require './wikiApp'
userApp = require './userApp'
fileApp = require './fileApp'
adminApp = require './adminApp'

noop = ->
process.env.uploadDir = uploadDir = __dirname + '/public/attachment'
WIKINAME = 'note'
ROOT_PATH = '/wikis/' + WIKINAME

app = express.createServer()

# Configuration
LISTEN_PORT = 3000
app.set 'views', __dirname + '/views'
app.set 'view engine', 'jade'

oneHour = 60*60*1000

app.configure ->
  app.use express.bodyParser
    uploadDir: uploadDir
  app.use express.cookieParser 'n4wiki session'
  app.use express.session()
  app.use express.methodOverride()
  app.use app.router
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
  app.use express.static __dirname + '/public'
  app.use express.errorHandler
      dumpExceptions: true,
      showStack: true,

app.configure 'production', ->
  app.use express.errorHandler()
  app.use express.staticCache()
  app.use express.static __dirname + '/public', { maxAge: oneHour }

# Routes
app.get '/', routes.index

# Wiki
app.get  ROOT_PATH + '/pages', wikiApp.getPages          # get page list
app.get  ROOT_PATH + '/pages/:name', wikiApp.getPage     # get a page
app.get  ROOT_PATH + '/new', wikiApp.getNew              # get a form to post new wikipage
app.post ROOT_PATH + '/pages', wikiApp.postNew           # post new wikipage
app.del  ROOT_PATH + '/pages/:name', wikiApp.postDelete   # delete wikipage
app.put  ROOT_PATH + '/subscribes/:name', wikiApp.postSubscribe     # subscribe wikipage
app.del  ROOT_PATH + '/subscribes/:name', wikiApp.postUnsubscribe   # unsubscribe wikipage
app.post '/api/note/pages/:name', wikiApp.postRollback  # wikipage rollback

# Login & Logout
app.post ROOT_PATH + '/users/login', userApp.postLogin   # post login

# User
app.get  ROOT_PATH + '/users', userApp.getUsers          # get user list
app.get  ROOT_PATH + '/users/new', userApp.getNew        # new user page
app.post ROOT_PATH + '/users/new', userApp.postNew       # post new user
app.get  ROOT_PATH + '/user/:id', userApp.getId          # show user information
app.post ROOT_PATH + '/user/:id', userApp.postId         # change user information (password change)
app.post ROOT_PATH + '/dropuser', userApp.postDropuser   # drop user

# attachment
app.get  ROOT_PATH + '/pages/:name/attachment', fileApp.getAttachment             # file attachment page
app.get  ROOT_PATH + '/pages/:name/attachment.:format', fileApp.getAttachmentList # file attachment list call by json
app.post ROOT_PATH + '/pages/:name/attachment.:format?', fileApp.postAttachment   # file attachment
app.del  ROOT_PATH + '/pages/:name/attachment/:filename', fileApp.delAttachment   # attachment file delete

# admin
app.get  '/admin/mail', adminApp.mail
app.post '/admin/mail', adminApp.postMail
app.get  '/admin/mailconf', adminApp.mailconf
app.post '/admin/mailconf', adminApp.postMailconf

exports.start = (port, callback) ->
    wikiApp.init WIKINAME
    app.listen port
    console.log "Express server listening on port %d in %s mode", port, app.settings.env
    callback() if callback

exports.stop = -> app.close

exports.start LISTEN_PORT if not module.parent
