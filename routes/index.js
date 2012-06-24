var fs = require('fs');
var path = require('path');
var i18n = require('../lib/i18n');
/*
 * GET home page.
 */

exports.index = function(req, res){
    res.render('index', {title: 'N4Wiki'});
};

exports.addUserForm = function(req, res){
    res.render('user/new', {title: '사용자 등록'});
}

exports.test = function(req, res){
    res.render('testpage',{title: 'test page'});
}
