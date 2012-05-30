var gitfs = require('./gitfs');
var _ = require('underscore');
var ghm = require('github-flavored-markdown');
var hljs = require('hljs');
require('../public/scripts/highlight-c.js');
var assert = require('assert');
var jsdiff = require('diff');
var nodemailer = require('nodemailer');
var User = require('./users').User;
var async = require('async');

function init(wikiname, callback) {
    var repopath = wikiname+'.pages.git';
    gitfs.init(repopath, callback);
}

function _createCommitRequest(name, content, message) {
    var files = {};
    var writer = {name: 'Guest', mail: 'guest@n4wiki.com', timezone: '+0900'};

    files[name + ""] = content;
    return {
        files: files,
        user: writer,
        message: message
    };
}

function writePage(name, content, callback) {
    gitfs.commit(_createCommitRequest(name, content, 'Edit ' + name), callback);
}

/**
 * commitId_ 시점에서의 page를 가져온다.
 *
 * @param name
 * @param commitId_
 * @param callback (err, page)
 */
function getPage(name, commitId_, callback) {
    var commitId = (typeof(commitId_) == 'string' ? commitId_ : null);
    var callback_ = arguments[arguments.length - 1];
    callback = (typeof(callback_) == 'function' ? callback_ : null);

    var show = function(err, commitId) {
        if (err) return callback(err);
        gitfs.getCommitIdFromHEAD(function(err, head) {
            if (err) return callback(err);
            gitfs.diff(name, commitId, head, 'bool', function(err, isEqual) {
                gitfs.show(name, commitId, function(err, buffer, commit) {
                    if (err) return callback(err);
                    var page = {
                        content: buffer.toString(),
                        commitId: commitId,
                        commit: commit,
                        isOld: !isEqual,
                    }
                    callback(err, page);
                });
            });
        });
    }

    if (commitId) {
        show(null, commitId);
    } else {
        gitfs.getCommitIdFromHEAD(show);
    }
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
            gitfs.createCommitFromTree(preparedCommit, tree, function (err, commitId) {
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

function getHistory(name, limit, callback) {
    gitfs.log(name, limit, callback);
}

function queryHistory(query, callback) {
    gitfs.queryLog(query, callback);
}

function rollback(name, commitId, callback) {
    var wiki = this;

    gitfs.show(name, commitId, function(err, content) {
        gitfs.commit(wiki._createCommitRequest(name, content, 'Rollback ' + name), callback);
    });
}

/**
 * Get difference between given revisions in given types.
 *
 * The `revision` value may be a single string such as
 * "44ba23b69a70768a3a71f4a29975f1b4b74a12d8"
 * or an array such as
 * `["289e51ec91fe50c5502383efd435ee1166fc3001",
 *   "44ba23b69a70768a3a71f4a29975f1b4b74a12d8"]`.
 *
 * See gitfs.diff for the details about the other parameters.
 *
 * Examples:
 *      a = "289e51ec91fe50c5502383efd435ee1166fc3001";
 *      b = "44ba23b69a70768a3a71f4a29975f1b4b74a12d8";
 *
 *      diff = wiki.diff('frontpage', [a, b], 'json');
 *      renderedDiff = wiki.renderDiff(diff);
 *
 *      diffs = wiki.diff('frontpage', [a, b], ['json', 'unified']);
 *      renderedDiff = wiki.renderDiff(diffs['json']);
 *
 * @param {String} name
 * @param {String|Array} revision(s)
 * @param {String|Array} type(s)
 * @return {String|Object}
 * @api public
 */
var diff = function(name, revSpec_, types_, callback) {
    var revSpec = (revSpec_ instanceof Array) ? revSpec_ : [revSpec_];
    var types = (typeof(types_) == 'string') ? [types_] : types_;
    var types = (types_ instanceof Array) ? types_ : undefined;
    var callback_ = arguments[arguments.length - 1];
    callback = (typeof(callback_) == 'function' ? callback_ : null);

    if (revSpec.length == 1) {
        gitfs.readObject(revSpec[0], function(err, commit) {
            if (err) {
                callback(err);
            } else {
                gitfs.diff(name, commit.parent, revSpec[0], types, callback);
            }
        });
    } else if (revSpec.length > 1) {
        gitfs.diff(name, revSpec[0], revSpec[1], types, callback);
    } else {
        callback(new Error('At least one revision is required.'));
    }
}

var renderDiff = function(diff, inlineCss) {
    var result = '';
    diff.forEach(function (seg) {
        var attr = '';
        if (inlineCss) {
            if (seg.added) {
                attr = "style = 'background-color: #DFD;'";
            } else if (seg.removed) {
                attr = "style = 'background-color: #FDD:'";
            }
        } else {
            if (seg.added) {
                attr = "class = 'added'"
            } else if (seg.removed) {
                attr = "class = 'removed'"
            }
        }
        result = _.reduce(
            seg.value.split('\n'),
            function(a, b) { return a + '<p ' + attr + '>'  + b + '</p>'; },
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
        } else {
            if (LIMIT < matched.length) {
                rendered = matched.substr(0, LIMIT) + '...';
            } else {
                rendered = matched;
            }
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
            async.forEachSeries(
                names,
                function(name, next) {
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
                        next(null);
                    });
                },
                function(err) {
                    callback(err, pages);
                }
            );
        });
    });
}

var readCommit = function(commitId, callback) {
    assert.ok(typeof(commitId) == 'string');
    gitfs.readObject(commitId, callback);
}

exports.deletePage = deletePage;
exports.writePage = writePage;
exports.getPage = getPage;
exports.init = init;
exports.render = render;
exports.getPages = getPages;
exports.getHistory = getHistory;
exports.queryHistory = queryHistory;
exports.rollback = rollback;
exports._createCommitRequest = _createCommitRequest;
exports.diff = diff;
exports.renderDiff = renderDiff;
exports.search = search;
exports.renderSearch = renderSearch;
exports.readCommit = readCommit;
