var nodemailer = require('nodemailer');

var send = function(mail, callback) {
    var handler;

    mail.from = this.from;
    mail.to = (mail.to instanceof Array) ? mail.to.join(', ') : mail.to;

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

    if (!this.smtpOptions) {
        return handler(new Error('wiki.smtpOptions is not configured.'));
    }

    // send mail
    nodemailer
        .createTransport("SMTP", this.smtpOptions)
        .sendMail(mail, handler);
}

exports.from = null;
exports.smtpOptions = null;
exports.send = send;
