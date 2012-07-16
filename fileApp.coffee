fs = require 'fs'
path = require 'path'
winston = require('winston')

#winston color enabled. In case of only working in console, user 'winston.cli()'
winston.default.transports.console.colorize = true

#default upload file folder
process.env.uploadDir = uploadDir = __dirname + '/public/attachment'

exports.getAttachment = (req, res) ->
  dirname = path.join process.env.uploadDir, req.params.name
  fs.readdir dirname, (err, filelist) ->
    filelist = filelist or []
    res.render 'fileupload.jade',
      title: '파일첨부',
      pageName: req.params.name,
      filelist: filelist

exports.getAttachmentList = (req, res) ->
  dirname = path.join process.env.uploadDir, req.params.name
  fs.readdir dirname, (err, filelist) ->
    filelist = filelist or []
    res.json
      title: '파일첨부'
      pageName: req.params.name
      filelist: filelist

exports.postAttachment = (req, res) ->
  pageName = req.params.name
  localUploadPath =
    path.dirname(req.files.attachment.path) + "/" + pageName
  fs.mkdir localUploadPath, (err) ->
    throw err if err and err.code != 'EEXIST'
    fs.rename req.files.attachment.path,
      localUploadPath + '/' + req.files.attachment.name,  (err) ->
        throw new Error "no file selected" if !req.files.attachment.name
        throw err if err
        switch req.params.format
          when 'partial'
            _renderFileuploadPartial req, res
          when 'json'
            res.json
              title   : '파일첨부'
              pageName: pageName
              filename: req.files.attachment.name
          else
            url = '/wikis/note/pages/' + pageName + '/attachment'
            res.redirect url

_renderFileuploadPartial = (req, res) ->
  dirname = path.join process.env.uploadDir, req.params.name
  fs.readdir dirname, (err, filelist) ->
    winston.info(filelist)
    filelist = filelist or []
    winston.info('filelist', filelist)
    res.render 'fileuploadPartial.jade',
      title   : '파일첨부'
      pageName: req.params.name
      filelist: filelist


exports.delAttachment = (req, res) ->
  filePath = path.join(uploadDir, req.params.name, req.params.filename)
  fs.unlink filePath, (err) ->
    winston.warn('Couldn\'t delete file: ' + filePath) if err
    _renderFileuploadPartial req, res
