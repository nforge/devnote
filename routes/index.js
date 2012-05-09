var fs = require('fs')
var path = require('path')
/*
 * GET home page.
 */

exports.index = function(req, res){
    res.render('index', { title: 'N4Wiki' });
};

exports.addUserForm = function(req, res){
    res.render('user/new', {title: '사용자 등록'});
}

