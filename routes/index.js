var fs = require('fs')
var path = require('path')
var i18n = require('../lib/i18n');

/*
 * GET home page.
 */

exports.index = function(req, res){
    res.render('index', {
        title: 'N4Wiki',
        messages: {
            welcome: i18n.__('Welcome to %s', 'N4Wiki'),
            note: i18n.__('Note'),
            frontpage: i18n.__('frontpage'),
            newNote: i18n.__('New Note'),
            noteList: i18n.__('Note List'),
            searchNotes: i18n.__('Search Notes'),
            user: i18n.__('User'),
            login: i18n.__('Login'),
            userList: i18n.__('User List'),
            newUser: i18n.__('New User'),
            admin: i18n.__('Administration'),
            sendMail: i18n.__('Send mail'),
            configureMail: i18n.__('Configure mail'),
        }

    });
};

exports.addUserForm = function(req, res){
    res.render('user/new', {title: '사용자 등록'});
}

exports.test = function(req, res){
    res.render('testpage',{title: 'test page'});
}
