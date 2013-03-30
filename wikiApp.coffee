fs = require 'fs'
wiki = require './lib/wiki'
url = require 'url'
debug = (require 'debug')('main')
assert = require 'assert'
mailer = require './lib/mailer'
User = require('./lib/users').User
_ = require 'underscore'
util = require 'util'
__ = (require './lib/i18n').__
renderer = require './lib/renderer'

ROOT_PATH = '/wikis/'
HISTORY_LIMIT = 30

lastVisits = {}
subscribers = {}

exports.init = (wikiname) ->
  ROOT_PATH += wikiname
  wiki.init wikiname, (err) ->
    if err
      console.log err.message
    else
      data = fs.readFileSync 'frontpage.md'
      wiki.writePage 'frontpage', data, null, (err) ->
        throw err if err

error404 = (err, req, res, next) ->
  console.log err
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
  handler = (err, history) ->
    if err
      error404 err, req, res
    else
      res.render 'history',
        title: name
        history: history
        limit: HISTORY_LIMIT
  if req.query.until
    offset = parseInt(req.query.offset or 0)
    wiki.queryHistory
      filename: name
      until: req.query.until
      offset: offset
      limit: HISTORY_LIMIT
      handler
  else
    wiki.getHistory name, HISTORY_LIMIT, handler

diff = (name, req, res) ->
  [diffA, diffB] = [req.query.diffA, req.query.diffB].map (param) ->
    index = param.lastIndexOf(',')
    [param.substr(0, index), param.substr(index + 1)]

  wiki.diff {filename: diffA[0], rev: diffA[1]}, {filename: diffB[0], rev: diffB[1]}, (err, diff) ->
    if err
      error404 err, req, res
    else
      res.render 'diff',
        title: 'Diff'
        name: name
        diff: renderer.diff diff

search = (req, res) ->
  keyword = req.query.keyword
  if keyword
    wiki.search keyword, (err, pages) ->
      throw err if err
      res.render 'search',
        title: 'Search'
        pages: renderer.search pages, keyword
  else
    res.render 'search',
      title: 'Search'
      pages: {}

exports.getPages = (req, res) ->
  switch req.query.action
    when 'search' then search req, res
    else list req, res, req.query.selectedPageName

# get wikipage list
list = (req, res, selectedPageName) ->
  wiki.getPages (err, pages) ->
    if err
      error404 err, req, res
    else if pages.length == 0 then res.render 'nopage', {title: 'nopage'}
    else
      pageName = selectedPageName or req.query.page or pages[0].name

      wiki.getPage pageName, (err, page) ->
        if err
          error404 err, req, res
        else
          subscribed = req.session.user and
            subscribers[pageName] and
            req.session.user.id in subscribers[pageName]

          res.render 'pages',
            title: 'Pages'
            pages: pages
            selectedPageName: pageName
            selectedPageContent: renderer.markdown page.content
            deletedPageName: req.query.deletedPageName
            subscribed: subscribed

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
      res.render 'new',
        title: 'Edit Page'
        pageName: name
        attachDir: name
        body: page.content
        filelist: []
        newPage: false

view = (name, req, res) ->
  wiki.getPage name, req.query.rev, (err, page) ->
    if err
      return error404 err, req, res

    subscribed = req.session.user and
      subscribers[name] and
      req.session.user.id in subscribers[name]

    renderPage = (lastVisit) ->
      options =
        title: name
        content: renderer.markdown page.content
        page: page
        subscribed: subscribed
        loggedIn: !!req.session.user
        lastVisit: lastVisit

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
      return wiki.readCommit lastVisitId,
        (err, commit) ->
          lastVisit =
            date: new Date commit.committer.unixtime * 1000
            id: lastVisitId
          return renderPage lastVisit
    else
      # nothing changed
      return renderPage()

exports.getNew = (req, res) ->
  res.render 'new',
    title: 'New Page'
    pageName: ''
    attachDir: '__new_' + new Date().getTime()
    filelist: []
    newPage: true

exports.postNew = (req, res) ->
  saveEditedPage = (name, body, callback) ->
    wiki.writePage name, body, req.session.user, (err, commitId) ->
      if req.session.user
        userId = req.session.user.id
        if not lastVisits[userId]
          lastVisits[userId] = {}
        lastVisits[userId][name] = commitId

      if subscribers[name]
        # send mail to subscribers of this page.
        wiki.diff {filename: name, rev: commitId}, null, ['json', 'unified'], (err, diff) ->
          user = req.session.user

          subject = '[n4wiki] ' + name + ' was edited'
          subject += (' by ' + user.id) if user

          if user
            ids = _.without subscribers[name], user.id
          else
            ids = subscribers[name]

          to = (User.findUserById(id).email for id in ids)

          mailer.send
            to: to
            subject: subject
            text: diff['unified']
            html: renderer.diff diff['json'], true

      callback err

  newPageName = req.body.name.trim()
  originalPageName = req.body.originalName
  body = req.body.body

  if originalPageName and (originalPageName != newPageName)
    wiki.renamePage originalPageName, newPageName, req.session.user, (err) ->
      saveEditedPage newPageName, body, (err) ->
        res.redirect ROOT_PATH + '/pages/' + encodeURIComponent(newPageName)
  else
    saveEditedPage newPageName, body, (err) ->
      res.redirect ROOT_PATH + '/pages/' + encodeURIComponent(newPageName)

exports.postDelete = (req, res) ->
  wiki.deletePage req.params.name, req.session.user, (err) ->
    res.redirect ROOT_PATH + '/pages?deletedPageName=' + req.params.name

exports.postRollback = (req, res) ->
  name = req.params.name
  wiki.rollback name, req.body.id, (err) ->
    wiki.getHistory name, HISTORY_LIMIT, (err, history) ->
      if err
        error404 err, req, res
      else
        res.contentType 'json'
        res.send
          history: history
          name: name
          ids: history.ids

exports.postSubscribe = (req, res) ->
  name = req.params.name
  if req.session.user
    subscribers[name] = [] if not subscribers[name]
    userId = req.session.user.id
    if not (userId in subscribers[name])
      subscribers[name].push userId

  res.redirect ROOT_PATH + '/pages/' + encodeURIComponent(name)

exports.postUnsubscribe = (req, res) ->
  name = req.params.name
  if req.session.user and subscribers[name]
    subscribers[name] = _.without subscribers[name], req.session.user.id

  res.redirect ROOT_PATH + '/pages/' + encodeURIComponent(name)
