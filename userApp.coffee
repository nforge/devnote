User = require('./lib/users').User
util = require('./lib/util')

exports.getUsers = (req, res) ->
  switch req.query.action
    when 'login' then login req, res
    else users req, res

exports.login = (req, res) ->
  res.render 'user/login'
    title: 'login'
    return_to: req.header('Referrer')

# get userlist
users = (req, res) ->
  userlist = User.findAll()
  res.render 'admin/userlist',
    title: 'User List',
    userlist: userlist

# post login
exports.postLogin =  (req, res) ->
  User.login
    id: req.body.id,
    password: req.body.password
    (err, user) ->
      if user
        req.session.regenerate ->
          req.session.user = User.findUserById(req.body.id)
          req.session.success = req.session.user.name + ' logined.'
          console.log req.session.success
          if req.body.return_to and req.body.return_to != req.header('Referrer')
            res.redirect req.body.return_to
          else
            res.redirect '/'
      else
        req.session.error = err.message
        res.redirect '/login'

# post logout
exports.postLogout =  (req, res) ->
  if req.session.user
    name = req.session.user.name
    delete req.session.user
    delete req.session.success
    console.log name + ' logout.'
  res.redirect req.header('Referrer')

exports.getNew = (req, res) ->
  res.render 'admin/adduser'
    title: 'new user'
    defaultTimezone: util.convertOffsetToTimezone new Date().getTimezoneOffset()

exports.postNew = (req, res) ->
  timezone = util.parseTimezone req.body.timezone
  timezone = timezone.sign + timezone.hour + timezone.min

  User.add
    id: req.body.id,
    name: req.body.name,
    email: req.body.email,
    timezone: timezone,
    password: req.body.password
  userInfo = User.findUserById req.body.id

  res.render 'admin/user',
    title: '사용자가 등록되었습니다.',
    content: "사용자 정보",
    userInfo: userInfo

exports.getId = (req, res) ->
  userInfo = User.findUserById req.params.id
  res.render 'admin/edituser',
    title: 'User information',
    content: "사용자 정보",
    user: userInfo

exports.postId = (req, res) ->
  targetUser = User.findUserById req.params.id
  timezone = util.parseTimezone req.body.timezone
  targetUser.timezone = timezone.sign + timezone.hour + timezone.min
  isValid = User.changePassword req.body.previousPassword,
    req.body.newPassword, targetUser
  targetUser.email = req.body.email if isValid
  User.save targetUser if isValid

  userInfo = User.findUserById req.params.id
  res.render 'admin/user',
    title: '사용자 정보가 변경되었습니다.',
    content: "사용자 정보",
    userInfo: userInfo

exports.postDropuser = (req, res) ->
  userInfo = User.findUserById req.body.id
  User.remove({id: req.body.id}) if userInfo
  res.redirect '/wikis/note/users'
