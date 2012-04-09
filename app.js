var util = require('util');

/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , wiki = require('./lib/wiki')
  , md = require('markdown-js');

var app = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes
app.get('/', routes.index);

app.error(function(err, req, res, next) {
    res.render('404.jade', { title: "404 Not Found", error: err.message, status: 404 });
});

// get a wikipage
app.get('/wikis/note/pages/:name', function(req, res) {
    wiki.getPage(req.params.name, function(err, content) {
        if (err) throw err;
        res.render('page', {
            title: req.params.name,
            content: md.parse(content)
        });
    });
});

// get a form to post new wikipage
app.get('/wikis/note/new', function(req, res) {
    res.render('new', {
        title: 'New Page',
    });
});

// get a form to edit a wikipage
app.get('/wikis/note/edit/:name', function(req, res) {
    wiki.getPage(req.params.name, function(err, content) {
        if (err) throw err;
        res.render('edit', {
            title: 'Edit Page',
            name: req.params.name,
            content: content
        });
    });
});

// post new wikipage
app.post('/wikis/note/pages', function(req, res) {
    wiki.writePage(req.body.name, req.body.body, function(err) {
        wiki.getPage(req.body.name, function(err, content) {
            res.render('page', {
                title: req.body.name,
                content: md.parse(content)
            });
        });
    });
});

// delete wikipage
app.delete('/wikis/note/pages/:name', function (req, res) {
    wiki.writePage(req.body.name, req.body.body, function (err) {
        wiki.getPage(req.body.name, function (err, content) {
            res.render('page', {
                title: req.body.name,
                content: md.parse(content)
            });
        });
    });

});

exports.start = function(port, callback) {
    wiki.init(function (err) {
        app.listen(port);
        console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
        if (callback) callback();
    });
}

exports.stop = function() {
    app.close();
}

if (!module.parent) {
    exports.start(3000);
}
