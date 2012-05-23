wiki = require './lib/wiki'
mailer = require './lib/mailer'
_ = require 'underscore'

exports.mailconf = (req, res) ->
    if not mailer.smtpOptions
        options = {}
    else
        options = _.clone mailer.smtpOptions

    options.from = mailer.from or ''
    if mailer.smtpOptions
        options.ssl = mailer.smtpOptions.secureConnection
        options.tls = !mailer.smtpOptions.ignoreTLS
        if mailer.smtpOptions.auth
            options.username = mailer.smtpOptions.auth.user

    res.render 'admin/mailconf.jade'
        options: options
        title: 'Mail Configuration'

exports.postMailconf = (req, res) ->
    mailer.from = req.body.from
    smtpOptions =
        host: req.body.host
        secureConnection: req.body.ssl
        port: req.body.port
        ignoreTLS: not req.body.tls
        authMethod: req.body.authMethod
        auth:
            user: req.body.username
            pass: req.body.password

    # Update password only if not empty.
    if (not smtpOptions.auth.pass) and mailer.smtpOptions and mailer.smtpOptions.auth
        smtpOptions.auth.pass = mailer.smtpOptions.auth.pass

    mailer.smtpOptions = smtpOptions

    res.redirect '/'

exports.mail = (req, res) ->
    res.render 'admin/mail.jade'
        notConfigured: !mailer.smtpOptions
        title: 'Mail'

exports.postMail = (req, res) ->
    mailer.send
        to: req.body.to,
        subject: req.body.subject
        text: req.body.body

    res.redirect '/admin/mail'
