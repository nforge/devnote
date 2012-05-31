var nodemailer = require('nodemailer');
var config = require('./config');

var send = function(mail, callback) {
    var handler;

    if (callback) {
        handler = callback;
    } else {
        handler = function(err, res) {
            if (err) {
                console.log(err);
            } else {
                console.log("Message sent: " + res.message);
            }
        }
    }

    options = config.get('mail');
    if (!options) {
        return handler(new Error('mail option is not configured.'));
    }

    mail.from = options.from;
    mail.to = (mail.to instanceof Array) ? mail.to.join(', ') : mail.to;

    // send mail
    nodemailer
        .createTransport("SMTP", options)
        .sendMail(mail, handler);
}

exports.send = send;
