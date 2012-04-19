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

/**
 * wiki.search 의 검색결과를 HTML로 렌더링한다.
 * @param searched wiki.search 의 결과값
 * @return result {
 *     <pagename>: <html>,
 *     ...,
 * }
 */
var renderSearch = function(searched) {
    var LIMIT = 120;
    var result = {};

    Object.keys(searched).forEach(function(name) {
        matched = searched[name];
        var rendered = '';

        if (matched instanceof Array) {
            keyword = matched[0];
            input = matched.input;
            index = matched.index;
            begin = Math.max(0, index - Math.floor((LIMIT - keyword.length) / 2));
            end = Math.max(begin + LIMIT, begin + keyword.length);

            if (begin > 0) {
                rendered += '...'
            }

            rendered +=
                input.substr(begin, index - begin) +
                '<span class="matched">' + keyword + '</span>' +
                input.substr(index + keyword.length, end - (index + keyword.length));

            if (end < input.length) {
                rendered += '...'
            }
        } else if (LIMIT < matched.length) {
            rendered = matched.substr(0, LIMIT) + '...';
        }

        result[name] = rendered;
    });

    return result;
}

var search = function(keyword, callback) {
    var pages = {}
    var treeId;

    gitfs.getHeadCommit(function(err, commit) {
        treeId = commit.tree;
        gitfs.readObject(treeId, function(err, tree) {
            var names = Object.keys(tree);
            var remains = names.length;
            names.forEach(function(name) {
                gitfs.readObject(tree[name], function(err, content) {
                    content = content.toString();
                    if (name.match(keyword)) {
                        pages[name] = content;
                    } else {
                        var matched = content.match(keyword);
                        if (matched) {
                            pages[name] = matched;
                        }
                    }
                    if (--remains == 0) {
                        callback(null, pages);
                    }
                });
            });
        });
    });
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
exports.search = search;
exports.renderSearch = renderSearch;
