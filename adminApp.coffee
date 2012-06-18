wiki = require './lib/wiki'
mailer = require './lib/mailer'
config = require './lib/config'
_ = require 'underscore'
__ = (require './lib/i18n').__


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
            title: __ 'Mail configuration'
            from: __ 'From'
            username: __ 'Username'
            usernameExample: __ 'Your name'
            password: __ 'Password'
            passwordWarning: __ 'This will be stored as a plain text in the server.'
            host: __ 'Host'
            hostExample: __ 'smtp.mail.com'
            port: __ 'Port'
            portExample: __ '25, 587 or 465'
            messages: __ 'Username'
            ssl: __ 'SSL'
            tls: __ 'TLS'
            authMethod: __ 'Authentication method'
            save: __ 'Save Changes'
            cancel: __ 'Cancel'
            authMethodExample: __ 'LOGIN or PLAIN'

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
            notConfigured: __ 'Mail is not configured. <a href="%s">Click here</a> to configure.', '/admin/mailconf'
            to: __ 'To'
            toExample: __ 'receiver@mail.com'
            title: __ 'Title'
            body: __ 'Body'
            send: __ 'Send'
            pageTitle: __ 'Send mail'

exports.postMail = (req, res) ->
    mailer.send
        to: req.body.to,
        subject: req.body.subject
        text: req.body.body

    res.redirect '/admin/mail'
