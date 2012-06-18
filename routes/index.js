var fs = require('fs')
var path = require('path')
var __ = require('../lib/i18n').__;

/*
 * GET home page.
 */

exports.index = function(req, res){
    res.render('index', {
        title: 'N4Wiki',
        messages: {
            welcome: __('Welcome to %s', 'N4Wiki'),
            note: __('Note'),
            frontpage: __('frontpage'),
            newNote: __('New Note'),
            noteList: __('Note List'),
            searchNotes: __('Search Notes'),
            user: __('User'),
            login: __('Login'),
            userList: __('User List'),
            newUser: __('New User'),
            admin: __('Administration'),
            sendMail: __('Send mail'),
            configureMail: __('Configure mail'),
        }

    });
};

exports.addUserForm = function(req, res){
    res.render('user/new', {title: '사용자 등록'});
}

exports.test = function(req, res){
    res.render('testpage',{title: 'test page'});
}
