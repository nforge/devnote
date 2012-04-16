var gitfs = require('./gitfs');
var _ = require('underscore');
var ghm = require('github-flavored-markdown');
var hljs = require('hljs');

function init(callback) {
    gitfs.init(callback);
}

function writePage(name, content, callback) {
    var files = {};

    files[name+""] = content;
    var commit = {
        files: files,
        author: {name: 'Guest', mail: 'guest@n4wiki.com', timezone: '+0900'},
        committer: {name: 'Guest', mail: 'guest@n4wiki.com', timezone: '+0900'},
        message: 'Edit ' + name
    };

    gitfs.commit(commit, callback);
}

function getPage(name, callback) {
    gitfs.show(name, function(err, buffer) {
        if (err) callback(err);
        else callback(err, buffer.toString());
    });
}

function deletePage(name, callback){
    var files = {};
    var treeId;

    var unixtime = Math.round(new Date().getTime() / 1000);

    var preparedCommit = {
        files: files,
        author: 'Guest <guest@n4wiki.com> ' + unixtime + ' +0900',
        committer: 'Guest <guest@n4wiki.com> ' + unixtime + ' +0900',
        message: 'delete ' + name
    };

    gitfs.getHeadCommit(function(err, commit) {
        treeId = commit.tree;
        gitfs.readObject(treeId, function(err, tree) {
            delete tree[name];
            gitfs._createCommitFromTree(preparedCommit, tree, function (err, commitId) {
                gitfs.getHeadTree(callback);
            })
        });
    });
}

function render(content) {
    // Syntax highlight
    content = content.replace(/```(\w+)((\r|\n|.)*?)(\r|\n)```/gm, function(match, p1, p2) {
        try {
            return '<pre><code class="' + p1 + '">' + hljs(p2, p1).value + '</code></pre>';
        } catch(e) {
            return '<pre><code>' + hljs(p2).value + '</code></pre>';
        }
    });

    // markdown rendering
    return ghm.parse(content);
}

function getPages(callback) {
    var pages = [];
    var treeId;

    gitfs.getHeadCommit(function(err, commit) {
        treeId = commit.tree;
        gitfs.readObject(treeId, function(err, tree) {
            for(var name in tree) {
                pages.push(name);

            }
            callback(null, pages);
        });        
    });
}

function getHistory(filename, callback) {
    gitfs.log(filename, callback);
}

exports.deletePage = deletePage;
exports.writePage = writePage;
exports.getPage = getPage;
exports.init = init;
exports.render = render;
exports.getPages = getPages;
exports.getHistory = getHistory;
