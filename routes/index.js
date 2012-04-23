var fs = require('fs')
var path = require('path')
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'N4Wiki' })
};

exports.addUserForm = function(req, res){
    res.render('user/new', {title: '사용자 등록'})
}

exports.attachment = function(req, res){
    var dirname = path.join(process.env.uploadDir, req.params.name);

    fs.readdir(dirname, function(err, filelist){
        filelist = filelist || [];
        res.render('fileupload.jade', {title: '파일첨부', pageName: req.params.name, filelist: filelist})
    });
}