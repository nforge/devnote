var gitfs = require('./gitfs');
var _ = require('underscore');
var assert = require('assert');
var jsdiff = require('diff');
var User = require('./users').User;
var async = require('async');
var path = require('path');

var ENCODING = 'utf8';

var init = function(wikiname, callback) {
  var repopath = path.join('notes', wikiname + '.git');
  return gitfs.init(repopath, callback);
};

/**
 * Create a commit request
 *
 * @param {String} name
 * @param {String} content
 * @param {String} message commit message
 */
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

/**
 * commitId_ 시점에서의 page를 가져온다.
 *
 * @param {String} name
 * @param {String} [commitId_]
 * @param {Function} callback (err, page)
 */
var getPage = function(pagename, commitId_, callback) {
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


/**
 * Write a page
 *
 * @param {String} name
 * @param {String} content
 * @param {Function} callback (err, commit)
 */
var writePage = function(name, content, callback) {
  getPage(name, function(err, page) {
    var getLineEnding, lineEnding, request;

    getLineEnding = function(text) {
      // Get the most appropriate(most frequent) line ending from the given
      // originalContent. If there are two or more most frequent line endings, the
      // list of proprities is lf, crlf and cr.

      var lf, crlf, cr, most;

      if (text instanceof Buffer) {
        text = text.toString(ENCODING);
      }

      console.log(text);

      lf = text.match(/[^\r]\n/g);
      crlf = text.match(/\r\n/g);
      cr = text.match(/\r[^\n]/g);

      lf = (lf && lf.length) || 0;
      crlf = (crlf && crlf.length) || 0;
      cr = (cr && cr.length) || 0;

      most = Math.max(cr, lf, crlf);

      if (lf === most) {
        return '\n';
      } else if (crlf === most) {
        return '\r\n';
      } else if (cr === most) {
        return '\r';
      }
    };

    if (page) {
      lineEnding = getLineEnding(page.content);
    } else {
      lineEnding = '\n';
    }

    if (content instanceof Buffer) {
      content = content.toString(ENCODING);
    }

    if (lineEnding !== '\r\n') {
      content = content.replace(/\r\n/g, lineEnding);
    }

    request = _createCommitRequest(name, content, 'Edit ' + name);

    return gitfs.commit(request, callback);
  });
};

/**
 * Delete a page.
 *
 * @param {String} pagename
 * @param {Function} callback (err, commit)
 */
var deletePage = function(pagename, callback) {
  var deleteAndCommit = function(baseTree, pagename, callback) {
    gitfs.getCommitIdFromHEAD(function(err, HEAD) {
      var unixtime = Math.round(new Date().getTime() / 1000);
      var commitData = {
        parent: HEAD,
        files: {},
        author: 'Guest <guest@n4wiki.com> ' + unixtime + ' +0900',
        committer: 'Guest <guest@n4wiki.com> ' + unixtime + ' +0900',
        message: 'Delete ' + pagename
      };

      delete baseTree[pagename];
      return gitfs.createCommitFromTree(commitData, baseTree, function(err) {
        return gitfs.getHeadTree(callback);
      });
    });
  };

  return gitfs.getHeadCommit(function(err, commit) {
    return gitfs.readObject(commit.tree, function(err, tree) {
      return deleteAndCommit(tree, pagename, callback);
    });
  });
};

/**
 * Get all pages
 *
 * @param {Function} callback (err, pages)
 */
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

/**
 * Get history of a page
 *
 * @param {String} pagename
 * @param {Number} limit
 * @param {Function} callback (err, commits)
 */
var getHistory = function(name, limit, callback) {
  assert.ok(callback);

  return gitfs.log(name, limit, callback);
};

/**
 * Query history of a page
 *
 * @param {String} query
 * @param {Function} callback (err, commits)
 */
var queryHistory = function(query, callback) {
  return gitfs.queryLog(query, callback);
};

/**
 * Roll a page back
 *
 * @param {String} name Roll a page matched this back
 * @param {String} commitId Roll a page back the commit matched this
 * @param {Function} callback (err, commit)
 */
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

/**
 * Search the given keyword in all pages
 *
 * @param {String} keyword
 * @param {Function} callback (err, commit)
 */
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

/**
 * Read a commit
 *
 * @param {String} commitId
 * @param {Function} callback (err, commit)
 */
var readCommit = function(commitId, callback) {
  assert.ok(typeof commitId === 'string');
  return gitfs.readObject(commitId, callback);
};

exports.deletePage = deletePage;
exports.writePage = writePage;
exports.getPage = getPage;
exports.init = init;
exports.getPages = getPages;
exports.getHistory = getHistory;
exports.queryHistory = queryHistory;
exports.rollback = rollback;
exports.diff = diff;
exports.search = search;
exports.readCommit = readCommit;
exports.getRepoPath = gitfs.getRepoPath;
