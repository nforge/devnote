var gitfs = require('./gitfs');
var _ = require('underscore');
var ghm = require('github-flavored-markdown');
var hljs = require('hljs');
var assert = require('assert');
var jsdiff = require('diff');

function init(callback) {
    gitfs.init(callback);
}

function _createCommitRequest(name, content, message) {
    var files = {};

    files[name + ""] = content;

    return {
        files: files,
        author: {name: 'Guest', mail: 'guest@n4wiki.com', timezone: '+0900'},
        committer: {name: 'Guest', mail: 'guest@n4wiki.com', timezone: '+0900'},
        message: message
    };
}

function writePage(name, content, callback) {
    gitfs.commit(_createCommitRequest(name, content, 'Edit ' + name), callback);
}

function getPage(name, callback) {
    gitfs._getCommitIdFromHEAD(function(err, commitId) {
        if (err) callback(err);
        gitfs.show(name, commitId, function(err, buffer) {
            if (err) callback(err);
            else callback(err, buffer.toString());
        });
    });
}

function getPageFrom(name, commitId, callback) {
    assert.ok(commitId);
    gitfs.show(name, commitId, function(err, buffer) {
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

function getHistory(name, callback) {
    gitfs.log(name, callback);
}

function rollback(name, commitId, callback) {
    var wiki = this;

    gitfs.show(name, commitId, function(err, content) {
        gitfs.commit(wiki._createCommitRequest(name, content, 'Rollback ' + name), callback);
    });
}

var diff = function(name, a, b, callback) {
    var wiki = this;

    wiki.getPageFrom(name, a, function(err, pageA) {
        wiki.getPageFrom(name, b, function(err, pageB) {
            callback(err, jsdiff.diffLines(pageA, pageB));
        });
    });
}

var renderDiff = function(diff) {
    var result = '';
    diff.forEach(function (seg) {
        var klass = '';
        if (seg.added) {
            klass = "class = 'added'"
        } else if (seg.removed) {
            klass = "class = 'removed'"
        }
        result = _.reduce(
            seg.value.split('\n'),
            function(a, b) { return a + '<p ' + klass + '>'  + b + '</p>'; },
            result);
    });
    return result;
}

exports.deletePage = deletePage;
exports.writePage = writePage;
exports.getPage = getPage;
exports.getPageFrom = getPageFrom;
exports.init = init;
exports.render = render;
exports.getPages = getPages;
exports.getHistory = getHistory;
exports.rollback = rollback;
exports._createCommitRequest = _createCommitRequest;
exports.diff = diff;
exports.renderDiff = renderDiff;
