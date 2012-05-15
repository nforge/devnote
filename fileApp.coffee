fs = require 'fs'
path = require 'path'

process.env.uploadDir = uploadDir = __dirname + '/public/attachment'

exports.getAttachment = (req, res) ->
    dirname = path.join process.env.uploadDir, req.params.name
    fs.readdir dirname, (err, filelist) ->
        filelist = filelist || []
        res.render 'fileupload.jade', {title: '파일첨부', pageName: req.params.name, filelist: filelist}

exports.getAttachmentList = (req, res) ->
    dirname = path.join process.env.uploadDir, req.params.name
    fs.readdir dirname, (err, filelist) ->
        filelist = filelist || []
        res.json {title: '파일첨부', pageName: req.params.name, filelist: filelist}

exports.postAttachment = (req, res) ->
    localUploadPath = path.dirname(req.files.attachment.path) + "/" + req.params.name
    fs.mkdir localUploadPath, (err) ->
        throw err if err && err.code != 'EEXIST'
        fs.rename req.files.attachment.path, localUploadPath + '/' + req.files.attachment.name,  (err) ->
            throw new Error "no file selected" if !req.files.attachment.name
            throw err if err
            switch req.params.format
                when 'partial'
                    _renderFileuploadPartial req, res
                when 'json' 
                    res.json 
                        title   : '파일첨부'
                        pageName: req.params.name
                        filename: req.files.attachment.name
                else 
                    res.redirect '/wikis/note/pages/' + req.params.name + '/attachment'

_renderFileuploadPartial = (req, res) ->
    dirname = path.join process.env.uploadDir, req.params.name
    fs.readdir dirname, (err, filelist) ->
        filelist = filelist || []
        res.render 'fileupload.partial.jade',
            layout  : false
            title   : '파일첨부'
            pageName: req.params.name
            filelist: filelist


exports.delAttachment = (req, res) ->
    filePath = path.join(uploadDir, req.params.name, req.params.filename)
    fs.unlink filePath, (err) ->
        console.err('Couldn\'t delete file: '+filePath) if err
        _renderFileuploadPartial req, res
