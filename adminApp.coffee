nodemailer = require "nodemailer"

exports.mail = (req, res) ->
    res.render 'admin/mail.jade'
        title: 'Mail'

exports.sendmail = (req, res) ->
    options =
        host: req.body.host
        secureConnection: req.body.ssl
        port: req.body.port
        ignoreTLS: !req.body.tls
        authMethod: req.body.authMethod
        auth:
            user: req.body.username
            pass: req.body.password

    smtpTransport =
        nodemailer.createTransport "SMTP", options

    mailOptions =
        from: req.body.from
        to: req.body.to
        subject: req.body.subject
        text: req.body.body

    # send mail with defined transport object
    smtpTransport.sendMail mailOptions, (error, response) ->
        if error
            console.log error
        else
            console.log "Message sent: " + response.message

    res.redirect '/admin/mail'
