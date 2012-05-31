wiki = require './lib/wiki'
mailer = require './lib/mailer'
config = require './lib/config'
_ = require 'underscore'

exports.mailconf = (req, res) ->
    options = (config.get 'mail') or {}

    options.ssl = options.secureConnection
    options.tls = !options.ignoreTLS

    console.log options

    if options.auth
        options.username = options.auth.user

    res.render 'admin/mailconf.jade'
        options: options
        title: 'Mail Configuration'

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

exports.postMail = (req, res) ->
    mailer.send
        to: req.body.to,
        subject: req.body.subject
        text: req.body.body

    res.redirect '/admin/mail'
