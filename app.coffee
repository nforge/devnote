# # profiling code ...
# profiler = require 'nodetime'
# profiler.profile()
# # profiling code ends here...


###
Module dependencies.
###
util = require 'util'
express = require 'express'
http = require 'http'
socket = require 'socket.io'

routes  = require './routes'
wikiApp = require './wikiApp'
userApp = require './userApp'
fileApp = require './fileApp'
adminApp = require './adminApp'
workingPage = require './lib/workingpage'
i18n = require './lib/i18n'
path = require 'path'

i18n.configure
  locales: ['en', 'ko']
  register: global

noop = ->
process.env.uploadDir = uploadDir = __dirname + '/public/attachment'
WIKINAME = 'note'
ROOT_PATH = '/wikis/' + WIKINAME
API_ROOT_PATH = '/api/' + WIKINAME

app = express()
server = http.createServer app
io = socket.listen server

io.sockets.on 'connection', (socket)->
  socket.emit 'connected', socket.id
  socket.on 'page name changed', (page)->
    result = workingPage.update page, page.user
    console.log workingPage.findAll()
    if result is false
      console.log( workingPage.findByPageName page.name )
      socket.emit 'dupped', workingPage.findByPageName page.name
    else
      socket.emit 'page name is ok'

  socket.on 'disconnect', ->
    workingPage.remove socket.id


# Configuration
LISTEN_PORT = 3000
app.set 'views', __dirname + '/views'
app.set 'view engine', 'jade'

oneDay = 60*60*1000*24

app.configure ->
  app.use express.bodyParser
    uploadDir: uploadDir
  app.use express.cookieParser 'n4wiki session'
  app.use express.session()
  app.use express.methodOverride()
  app.use i18n.init
  app.use app.router
  app.use express.logger 'dev'

# Session-persisted message middleware
app.locals.use (req, res) ->
  err = req.session.error
  loginMessage = req.session.success
  delete req.session.error
  #delete req.session.success

  res.locals.user = req.session.user

  res.locals.loginMessage = loginMessage || ''
  res.locals.wikiName = 'note'
  if err
    res.locals.flashMessage = err
  if loginMessage
    res.locals.loginMessage = loginMessage

  res.locals.wikiName = WIKINAME
  res.locals.joinPath = path.join
  res.locals.sprintf = require('./lib/sprintf').sprintf

app.configure 'development', ->
  app.use express.static __dirname + '/public'
  app.use express.errorHandler
    dumpExceptions: true,
    showStack: true,

app.configure 'production', ->
  app.use express.errorHandler()
  app.use express.staticCache()
  app.use express.static __dirname + '/public', { maxAge: oneDay }

# Routes
app.get '/', wikiApp.getPages
app.get '/test', routes.test

# Wiki
app.get  ROOT_PATH + '/pages', wikiApp.getPages                   # get page list
app.get  ROOT_PATH + '/pages/:name', wikiApp.getPage              # get a page
app.get  ROOT_PATH + '/new', wikiApp.getNew                       # get a form to post new wikipage
app.post ROOT_PATH + '/pages', wikiApp.postNew                    # post new wikipage
app.del  ROOT_PATH + '/pages/:name', wikiApp.postDelete           # delete wikipage
app.put  ROOT_PATH + '/subscribes/:name', wikiApp.postSubscribe   # subscribe wikipage
app.del  ROOT_PATH + '/subscribes/:name', wikiApp.postUnsubscribe # unsubscribe wikipage
app.post API_ROOT_PATH + '/pages/:name', wikiApp.postRollback     # wikipage rollback

# Login & Logout
app.get '/login', userApp.login        # get login
app.post '/login', userApp.postLogin   # post login
app.post '/logout', userApp.postLogout # post logout

# User
app.get  ROOT_PATH + '/users', userApp.getUsers        # get user list
app.get  ROOT_PATH + '/users/new', userApp.getNew      # new user page
app.post ROOT_PATH + '/users/new', userApp.postNew     # post new user
app.get  ROOT_PATH + '/user/:id', userApp.getId        # show user information
app.post ROOT_PATH + '/user/:id', userApp.postId       # change user information (password change)
app.post ROOT_PATH + '/dropuser', userApp.postDropuser # drop user

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
  server.listen port
  console.log "Express server listening on port %d in %s mode", port, app.settings.env
  callback() if callback

exports.stop = -> app.close

exports.start LISTEN_PORT if not module.parent

process.on 'uncaughtException', (err) ->
  console.log "uncaughtException occurred! ------>", err.message
  console.log err

