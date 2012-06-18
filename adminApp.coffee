wiki = require './lib/wiki'
mailer = require './lib/mailer'
config = require './lib/config'
_ = require 'underscore'
i18n = require './lib/i18n'

exports.mailconf = (req, res) ->
    options = (config.get 'mail') or {}

    options.ssl = options.secureConnection
    options.tls = !options.ignoreTLS

    if options.auth
        options.username = options.auth.user

    res.render 'admin/mailconf.jade'
        options: options
        title: 'Mail Configuration'
        messages:
            title: i18n.__ 'Mail configuration'
            from: i18n.__ 'From'
            username: i18n.__ 'Username'
            usernameExample: i18n.__ 'Your name'
            password: i18n.__ 'Password'
            passwordWarning: i18n.__ 'This will be stored as a plain text in the server.'
            host: i18n.__ 'Host'
            hostExample: i18n.__ 'smtp.mail.com'
            port: i18n.__ 'Port'
            portExample: i18n.__ '25, 587 or 465'
            messages: i18n.__ 'Username'
            ssl: i18n.__ 'SSL'
            tls: i18n.__ 'TLS'
            authMethod: i18n.__ 'Authentication method'
            save: i18n.__ 'Save Changes'
            cancel: i18n.__ 'Cancel'
            authMethodExample: i18n.__ 'LOGIN or PLAIN'

exports.postMailconf = (req, res) ->
    originOptions = config.get 'mail'
    newOptions =
        from: req.body.from
        host: req.body.host
        secureConnection: req.body.ssl
        port: req.body.port
        ignoreTLS: not req.body.tls
        authMethod: req.body.authMethod
        auth:
            user: req.body.username
            pass: req.body.password

    # Update password only if not empty.
    if (not newOptions.auth.pass) and originOptions and originOptions.auth
        newOptions.auth.pass = originOptions.auth.pass

    config.set 'mail', newOptions

    res.redirect '/'

exports.mail = (req, res) ->
    res.render 'admin/mail.jade'
        notConfigured: !(config.get 'mail')
        title: 'Mail'
        messages:
            notConfigured: i18n.__ 'Mail is not configured. <a href="%s">Click here</a> to configure.', '/admin/mailconf'
            to: i18n.__ 'To'
            toExample: i18n.__ 'receiver@mail.com'
            title: i18n.__ 'Title'
            body: i18n.__ 'Body'
            send: i18n.__ 'Send'
            pageTitle: i18n.__ 'Send mail'

exports.postMail = (req, res) ->
    mailer.send
        to: req.body.to,
        subject: req.body.subject
        text: req.body.body

    res.redirect '/admin/mail'
