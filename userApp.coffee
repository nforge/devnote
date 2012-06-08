User = require('./lib/users').User

exports.getUsers = (req, res) ->
    switch req.query.action
        when 'login' then login req, res
        else users req, res

login = (req, res) ->
    res.render 'user/login'
        title: 'login'

# get userlist
users = (req, res) ->
    userlist = User.findAll()
    res.render 'user/userlist',
        title: 'User List',
        content: "등록된 사용자 " + Object.keys(userlist).length + "명",
        userlist: userlist

# post login
exports.postLogin =  (req, res) ->
    console.log req.session.user
    User.login
        id: req.body.id,
        password: req.body.password
        (err, user) ->
            if user
                req.session.regenerate ->
                    req.session.user = User.findUserById(req.body.id)
                    req.session.success = req.session.user.name + ' logined.'
                    res.redirect '/'
            else
                req.session.error = err.message
                res.redirect '/'

exports.getNew = (req, res) ->
    res.render 'user/new'
        title: 'new user'

exports.postNew = (req, res) ->
    User.add
        id: req.body.id,
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
    userInfo = User.findUserById req.body.id

    res.render 'user/user',
        title: '사용자가 등록되었습니다.',
        content: "사용자 정보",
        userInfo: userInfo

exports.getId = (req, res) ->
    userInfo = User.findUserById req.params.id
    res.render 'user/edit',
        title: 'User information',
        content: "사용자 정보",
        user: userInfo

exports.postId = (req, res) ->
    targetUser = User.findUserById req.params.id
    isValid = user.changePassword req.body.previousPassword,
        req.body.newPassword, targetUser
    targetUser.email = req.body.email if isValid
    User.save targetUser if isValid

    userInfo = User.findUserById req.params.id
    res.render 'user/user',
        title: '사용자 정보가 변경되었습니다.',
        content: "사용자 정보",
        userInfo: userInfo

exports.postDropuser = (req, res) ->
    userInfo = User.findUserById req.body.id
    User.remove({id: req.body.id}) if userInfo
    res.redirect '/wikis/note/users'

