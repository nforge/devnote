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
var path = require('path');

var init = function(wikiname, callback) {
  var repopath = path.join('notes', wikiname + '.git');
  return gitfs.init(repopath, callback);
};

var _createCommitRequest = function(name, content, message) {
  var files = {};
  var writer = {
    name: 'Guest',
    mail: 'guest@n4wiki.com',
    timezone: '+0900'
  };

  files[name.toString()] = content;
  return {
    files: files,
    user: writer,
    message: message
  };
};

var writePage = function(name, content, callback) {
  var request = _createCommitRequest(name, content, 'Edit ' + name);
  return gitfs.commit(request, callback);
};

/**
 * commitId_ 시점에서의 page를 가져온다.
 *
 * @param name
 * @param commitId_
 * @param callback (err, page)
 */
var getPage = function(pagename, commitId_) {
  var commitId = (typeof commitId_ === 'string' ? commitId_ : null);
  var callback_ = arguments[arguments.length - 1];
  var callback = (typeof callback_ === 'function' ? callback_ : null);

  var show = function(pagename, commitId, isEqual, callback) {
    return gitfs.show(pagename, commitId, function(err, buffer, commit) {
      if (err) return callback(err);
      if (typeof buffer == 'string' || buffer instanceof Buffer) {
        var page = {
          content: buffer.toString(),
          commitId: commitId,
          commit: commit,
          isOld: !isEqual
        };
        return callback(err, page);
      } else {
        return callback(new Error('The file matched given pagename is not a regular file, but maybe a directory.'));
      }
    });
  };

  if (!commitId) {
    return gitfs.getCommitIdFromHEAD(function(err, HEAD) {
      if (err) return callback(err);
      return show(pagename, HEAD, true, callback);
    });
  }

  var isChangedSince = function(commitId, callback) {
    return gitfs.getCommitIdFromHEAD(function(err, HEAD) {
      if (err) return callback(err);
      var cb = function(err, isEqual) {
        if (err) return callback(err);
        return callback(err, isEqual);
      };
      return gitfs.diff(pagename, commitId, HEAD, 'bool', cb);
    });
  };

  return isChangedSince(commitId, function(err, isEqual) {
    if (err) return callback(err);
    return show(pagename, commitId, isEqual, callback);
  });
};

var deletePage = function(pagename, callback) {
  var deleteAndCommit = function(baseTree, pagename, callback) {
    var unixtime = Math.round(new Date().getTime() / 1000);
    var commitData = {
      files: {},
      author: 'Guest <guest@n4wiki.com> ' + unixtime + ' +0900',
      committer: 'Guest <guest@n4wiki.com> ' + unixtime + ' +0900',
      message: 'Delete ' + pagename
    };

    delete baseTree[pagename];
    return gitfs.createCommitFromTree(commitData, baseTree, function(err) {
      return gitfs.getHeadTree(callback);
    });
  };

  return gitfs.getHeadCommit(function(err, commit) {
    return gitfs.readObject(commit.tree, function(err, tree) {
      return deleteAndCommit(tree, pagename, callback);
    });
  });
};

var render = function(content) {
  // Syntax highlight
  var pattern = /```(\w+)((\r|\n|.)*?)(\r|\n)```/gm;
  content = content.replace(pattern, function(match, p1, p2) {
    var startTag, highlighted, endTag;

    try {
      highlighted = hljs(p2, p1).value;
      startTag = '<pre><code class="' + p1 + '">';
    } catch (e) {
      highlighted = hljs(p2).value;
      startTag = '<pre><code>';
    }

    endTag = '</code></pre>';

    return startTag + highlighted + endTag;
  });

  // markdown rendering
  return ghm.parse(content);
};

var getPages = function(callback) {
  var pages = [];

  return gitfs.getHeadCommit(function(err, commit) {
    var treeId = commit.tree;
    return gitfs.readObject(treeId, function(err, tree) {
      for (var name in tree) {
        pages.push(name);
      }
      return callback(null, pages);
    });
  });
};

var getHistory = function(name, limit, callback) {
  return gitfs.log(name, limit, callback);
};

var queryHistory = function(query, callback) {
  return gitfs.queryLog(query, callback);
};

var rollback = function(name, commitId, callback) {
  return gitfs.show(name, commitId, function(err, content) {
    var message = 'Rollback ' + name;
    var request = _createCommitRequest(name, content, message);
    return gitfs.commit(request, callback);
  });
};

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
  var types = (typeof types_ === 'string') ? [types_] : types_;
  types = (types_ instanceof Array) ? types_ : undefined;
  var callback_ = arguments[arguments.length - 1];
  callback = (typeof callback_ === 'function' ? callback_ : null);

  if (revSpec.length === 1) {
    return gitfs.readObject(revSpec[0], function(err, commit) {
      if (err) return callback(err);
      return gitfs.diff(name, commit.parent, revSpec[0], types, callback);
    });
  }

  if (revSpec.length > 1) {
    return gitfs.diff(name, revSpec[0], revSpec[1], types, callback);
  }

  return callback(new Error('At least one revision is required.'));
};

var search = function(keyword, callback) {
  var foundPages = {};

  var getMatchedPages = function(tree, keyword, callback) {
    var pagenames = Object.keys(tree);
    return async.forEachSeries(
    pagenames, function(name, next) {
      var matched;

      gitfs.readObject(tree[name], function(err, content) {
        if (typeof content === 'string' || content instanceof Buffer) {
          content = content.toString();
        } else {
          content = '';
        }

        if (name.match(keyword)) {
          foundPages[name] = content;
        } else {
          matched = content.match(keyword);
          if (matched) {
            foundPages[name] = matched;
          }
        }
        return next(null);
      });
    }, function(err) {
      return callback(err, foundPages);
    });
  };

  return gitfs.getHeadCommit(function(err, commit) {
    return gitfs.readObject(commit.tree, function(err, tree) {
      return getMatchedPages(tree, keyword, callback);
    });
  });
};

var readCommit = function(commitId, callback) {
  assert.ok(typeof commitId === 'string');
  return gitfs.readObject(commitId, callback);
};

exports.deletePage = deletePage;
exports.writePage = writePage;
exports.getPage = getPage;
exports.init = init;
exports.render = render;
exports.getPages = getPages;
exports.getHistory = getHistory;
exports.queryHistory = queryHistory;
exports.rollback = rollback;
exports.diff = diff;
exports.search = search;
exports.readCommit = readCommit;
exports.getRepoPath = gitfs.getRepoPath;