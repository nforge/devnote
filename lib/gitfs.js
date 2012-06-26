var fs = require('fs');
var async = require('async');
var crypto = require('crypto');
var zlib = require('zlib');
var path = require('path');
var assert = require('assert');
var _ = require('underscore');
var packutil = require('./packutil');
var WritableStream = require('./writablestream').WritableStream;
var jsdiff = require('diff');
var mkdirp = require('mkdirp');

var NUL = '\u0000';
var REPO_PATH = 'pages.git';
var ENCODING = 'utf8';

var OBJECT_TYPE = {
  NONE: 0,
  COMMIT: 1,
  TREE: 2,
  BLOB: 3,
  TAG: 4
};

var OBJECT_ID_LENGTH = 40;

var memo = {};
var memoIdQueue = [];
var MEMOIZE_NUMBERS_LIMIT = 10000;
var MEMOIZE_ENTITY_MAXSIZE = 40960;

var init = function(repopath, callback) {
  REPO_PATH = repopath;
  path.exists(REPO_PATH, function(exists) {
    if (exists) return callback(new GitFsError(REPO_PATH + " already exists"));
    mkdirp(REPO_PATH, function(err) {
      if (err) return callback(err);
      return async.series([
        async.apply(async.map, [REPO_PATH + '/objects', REPO_PATH + '/refs'], fs.mkdir),
        async.apply(fs.mkdir, REPO_PATH + '/refs/heads'),
        async.apply(fs.writeFile, REPO_PATH + '/HEAD', 'ref: refs/heads/master')
        ], callback);
    });
  });
};

var _serializeBlob = function(content) {
  if (typeof content === 'string') {
    return 'blob ' + Buffer.byteLength(content, ENCODING) + NUL + content;
  } else {
    return 'blob ' + content.length + NUL + content;
  }
};

var _hash = function(data) {
  if (typeof data === 'string') {
    return crypto.createHash('sha1').update(data, ENCODING).digest('hex');
  } else {
    return crypto.createHash('sha1').update(data, 'binary').digest('hex');
  }
};

var _createObjectBucket = function(id, callback) {
  var bucketPath = REPO_PATH + '/objects/' + id.substr(0, 2);
  fs.mkdir(bucketPath, function(err) {
    callback(err, bucketPath);
  });
};

var _serializeTree = function(tree) {
  var ws;

  ws = new WritableStream();
  Object.keys(tree).sort().forEach(function(blobName) {
    ws.write(new Buffer("100644 " + blobName + NUL, ENCODING));
    ws.write(new Buffer(tree[blobName], 'hex'));
  });
  ws.buffers.unshift(new Buffer("tree " + ws.getLength() + NUL, ENCODING));

  return ws.getBuffer();
};

var _storeObject = function(serialized, callback) {
  var id;

  id = _hash(serialized);

  zlib.deflate(serialized, function(err, deflatedObject) {
    _createObjectBucket(id, function(err, bucketPath) {
      var objectPath;

      objectPath = path.join(bucketPath, id.substr(2));
      fs.writeFile(objectPath, deflatedObject, function(err) {
        callback(err, id);
      });
    });
  });
};


var getCommitIdFromHEAD = function(callback) {

  if (path.existsSync(REPO_PATH + '/HEAD')) {

    // We didn't use fs.readFile because of its bug on Windows.
    // Fortunately, it has been fixed in v0.6 branch of Node.js.
    // See https://github.com/joyent/node/issues/3051
    var data, refName, ref, id, refs;

    data = fs.readFileSync(REPO_PATH + '/HEAD');
    assert.ok(data);
    refName = data.toString().split('\n')[0].substr(5);
    ref = path.join(REPO_PATH, refName);

    if (path.existsSync(ref)) {
      id = fs.readFileSync(ref);

      if (id) {
        return callback(null, id.slice(0, OBJECT_ID_LENGTH).toString());
      }

      return callback(null, null);
    }

    if (path.existsSync(path.join(REPO_PATH, 'packed-refs'))) {
      refs = fs.readFileSync(path.join(REPO_PATH, 'packed-refs')).
      toString().split('\n');
      return refs.forEach(function(ref) {
        var pair;

        if (ref && ref[0] !== '#') {
          pair = ref.split(' ');
          if (pair[1] === refName) {
            return callback(null, pair[0]);
          }
        }
      });
    }

    return callback(new GitFsError(ref + ' does not exist'));
  }

  return callback(new GitFsError('HEAD does not exist'));
};

var _serializeCommit = function(commit) {
  var raw = '';

  raw += 'tree ' + commit.tree + '\n';
  if (commit.parent) {
    raw += 'parent ' + commit.parent + '\n';
  }
  raw += 'author ' + commit.author + '\n';
  raw += 'committer ' + commit.committer + '\n\n';
  raw += commit.message;
  return new Buffer('commit ' + Buffer.byteLength(raw, ENCODING) + NUL + raw, ENCODING);
};

var _storeFiles = function(files, callback) {
  var tree = {};
  async.forEach(_.keys(files), function(filename, cb) {
    _storeObject(_serializeBlob(files[filename]), function(err, id) {
      tree[filename] = id;
      return cb(err);
    });
  }, function(err) {
    return callback(err, tree);
  });
};

/**
 *
 * @param commitData which doesn't have treeId
 * @param tree
 * @param callback
 * @private
 */
var createCommitFromTree = function(commitData, tree, callback) {
  _storeObject(_serializeTree(tree), function(err, id) {
    commitData.tree = id;
    _storeObject(_serializeCommit(commitData), function(err, id) {
      fs.writeFile(REPO_PATH + '/refs/heads/master', id, function(err) {
        callback(err, id);
      });
    });
  });
};

/**
 * commit request 객체를 이용해서 commit Data 구조를 만든다.
 *
 * @param request = {
 *              files: { 'welcome': 'welcome new pages.....', ...},
 *              user: { name: .., id: .., email: .., timezone: '+0900'},
 *              message: 'initial commit'
 *          }
 * @return commitData
 * @private
 */

var _prepareCommitData = function(request) {
  var unixtime, writer;

  unixtime = Math.round(new Date().getTime() / 1000);
  writer =
      request.user.name + ' <' + request.user.email + '> ' + unixtime + ' ' +
      request.user.timezone;

  return {
    author: writer,
    committer: writer,
    message: request.message
  };
};

/**
 * parentID를 이용해 현재 tree가 참조하는 부모 tree 객체를 얻어온다.
 *
 * @param callback (err, tree)
 */
var _getParentTree = function(parentId, callback) {
  readObject(parentId, function(err, parentCommit) {
    readObject(parentCommit.tree, callback);
  });
};

/**
 * commit request 객체를 이용해서 커밋작업을 한다.
 *
 * @param request = {
 *              files: { 'welcome': 'welcome new pages.....', ...},
 *              user: { name: .., id: .., email: .., timezone: '+0900'},
 *              message: 'initial commit'
 *          }
 * @param callback (err, commitId)
 */
var commit = function(request, callback) {
  var tree, commitData;

  tree = {};
  commitData = _prepareCommitData(request);

  async.series({
    storeFiles: function(cb) {
      _storeFiles(request.files, function(err, data) {
        tree = data;
        cb(err);
      });
    },
    commit: function(cb) {
      getCommitIdFromHEAD(function(err, parentId) {
        if (parentId) {
          commitData.parent = parentId;
          _getParentTree(parentId, function(err, parentTree) {
            for (var key in parentTree) if (!tree[key]) {
              tree[key] = parentTree[key];
            }
            createCommitFromTree(commitData, tree, cb);
          });
        } else {
          createCommitFromTree(commitData, tree, cb);
        }
      });
    }
  }, function(err, result) {
    // result.commit == createCommitFromTree의 cb결과
    callback(err, result.commit);
  });
};

var _getObjectPath = function(id) {
  return path.join(REPO_PATH, 'objects', id.substr(0, 2), id.substr(2));
};

var _parseCommitBody = function(buffer) {
  //             /tree 635a6d85573c97658e6cd4511067f2e4f3fe48cb
  // fieldPart --|parent 0cc71c0002496eccbe919c2e5f4c0616f9f2e611
  //             |author Yi, EungJun <semtlenori@gmail.com> 1333091842 +0900
  //             \committer Yi, EungJun <semtlenori@gmail.com> 1333091842 +0900
  //
  //   message -- Remove duplication between gitfs.createTreeRaw() and its test.
  var commit, parts, fieldPart;

  commit = {};
  parts = buffer.toString(ENCODING).split('\n\n');
  fieldPart = parts[0];
  commit.message = parts[1];

  fieldPart.split('\n').forEach(function(line) {
    // tree      635a6d85573c97658e6cd4511067f2e4f3fe48cb
    // parent    0cc71c0002496eccbe919c2e5f4c0616f9f2e611
    // author    Yi, EungJun <semtlenori@gmail.com> 1333091842 +0900
    // committer Yi, EungJun <semtlenori@gmail.com> 1333091842 +0900
    // \_______/ \_________________________________________________/
    //     |                          |
    // category                      data
    var index, category, data, matches;

    index = line.indexOf(' ');
    category = line.substr(0, index);
    data = line.substr(index + 1);
    switch (category) {
    case 'tree':
    case 'parent':
      commit[category] = data;
      break;
    case 'author':
    case 'committer':
      matches = data.match(/^(.*?) <([^<>]*)> (\d*) (.\d*)/);

      commit[category] = {
        name: matches[1],
        email: matches[2],
        unixtime: matches[3],
        timezone: matches[4]
      };
      break;
    default:
      break;
    }
  });

  return commit;
};

var _findInTree = function(buffer, blobName) {
  var begin, expected, matching, result, pointer;

  begin = null;
  expected = new Buffer(blobName, ENCODING);
  matching = false;
  result = null;

  for (pointer = 0; pointer < buffer.length; pointer++) {
    if (buffer[pointer] === 0) {
      if (matching) {
        result = buffer.toString('hex', pointer + 1, pointer + 1 + 20);
        return result;
      }
      pointer += 20;
    }

    if (begin !== null) {
      matching = buffer[pointer] === expected[pointer - begin];
      if (!matching) {
        begin = null;
      }
    }

    if (buffer[pointer] === 32) {
      begin = pointer + 1;
    }
  }

  return false;
};

//
// buffer contents
// `"tree" <SP> content-length <NUL> 1*("100644" <SP> wikipage-name <NUL> sha-1)`
var _parseTreeBody = function(buffer) {
  var tree, SHA1SUM_BYTE_LENGTH, id, begin, filename, pos;

  tree = {};
  SHA1SUM_BYTE_LENGTH = 20;
  begin = null;

  var _getParsedFileNameByNul = function(bufferString) {
    var permPartRemoved = bufferString.split(NUL, 1)[0];
    return permPartRemoved.substring(permPartRemoved.indexOf(' ') + 1);
  }

  for (pos = 0; pos < buffer.length; pos++) {
    if (begin === null && buffer[pos] === 32) {
      begin = pos + 1;
    } else if (begin !== null && buffer[pos] === 0) {
      filename = buffer.toString(ENCODING, begin, pos);
      id = buffer.toString('hex', pos + 1, pos + 1 + SHA1SUM_BYTE_LENGTH);
      tree[filename] = id;
      pos += SHA1SUM_BYTE_LENGTH;
      begin = null;
    }
  }

  return tree;
};

var _parseObject = function(type, body) {
  switch (type) {
  case OBJECT_TYPE.COMMIT:
    return _parseCommitBody(body);
  case OBJECT_TYPE.TREE:
    return _parseTreeBody(body);
  case OBJECT_TYPE.BLOB:
  case OBJECT_TYPE.TAG:
    return body;
  default:
    throw new GitFsError("Unknown type: " + type);
  }
};

var packIds = [];

// read a git object from packed objects.
var _readObjectFromPack = function(id, callback) {
  var _findInPack = function(packId, next) {
    return packutil.load(REPO_PATH, packId, function(err, pack) {
      if (err) return callback(err);
      packIds[packId] = pack;
      return pack.getObject(id, function(err, type, body) {
        if (body) {
          return callback(null, type, body);
        }

        return next();
      });
    });
  }

  var _find = function(files) {
    var matched, packId;

    if (!files || files.length === 0) {
      return callback(
      new GitFsError("pack: Object '" + id + "' does not exist."));
    }

    matched = files.pop().match(/pack-([0-9abcdef]{40}).idx/);  //ToDo: 주석 달것!

    if (!matched) {
      return _find(files);
    }

    packId = matched[1];

    return _findInPack(packId, function() {
      return _find(files);
    });
  }

  var _findInPacks = function(packIds, id) {
    if (!packIds || packIds.length === 0) {
      var packFilename = path.join(REPO_PATH, 'objects/pack');
      return fs.readdir(packFilename, function(err, files) {
        if (err) return callback(err);
        return _find(files);
      });
    }

    var packId = packIds.pop();

    return _findInPack(packId, function() {
      return _findInPacks(packIds, id);
    });
  }

  return _findInPacks(packIds, id);
};

// read a git object from loose objects.
var _readObjectFromLoose = function(id, callback) {
  assert.ok(typeof id === 'string');

  zlib.inflate(fs.readFileSync(_getObjectPath(id)), function(err, buffer) {
    if (err) throw err;
    var header, body, headerFields, type;

    header = buffer.toString().split(NUL, 1)[0];
    body = buffer.slice(header.length + 1);
    headerFields = header.split(' ');
    type = {
      'commit': OBJECT_TYPE.COMMIT,
      'tree': OBJECT_TYPE.TREE,
      'blob': OBJECT_TYPE.BLOB,
      'tag': OBJECT_TYPE.TAG
    }[headerFields[0]];
    return callback(err, type, body);
  });
};

var findInTree = function(id, blobName, callback) {
  assert.equal(typeof id, 'string');

  if (!id) {
    throw new GitFsError("object id is empty: " + id);
  }

  if (id.toString().length > OBJECT_ID_LENGTH) {
    throw new GitFsError("id.length > " + OBJECT_ID_LENGTH + ": " + id);
  }

  var cb = function(err, type, body) {
    if (err) return callback(err);
    return callback(null, _findInTree(body, blobName));
  };

  if (path.existsSync(_getObjectPath(id))) {
    return _readObjectFromLoose(id, cb);
  } else {
    return _readObjectFromPack(id, cb);
  }
};

var readObject = function(id, callback) {
  var object;

  assert.equal(typeof id, 'string');

  if (!id) {
    throw new GitFsError("object id is empty: " + id);
  }

  if (id.toString().length > OBJECT_ID_LENGTH) {
    throw new GitFsError("id.length > " + OBJECT_ID_LENGTH + ": " + id);
  }

  object = memo[id];

  if (object) {
    return callback(null, object);
  }

  var cb = function(err, type, body) {
    if (err) return callback(err);

    object = _parseObject(type, body);

    if (body.length <= MEMOIZE_ENTITY_MAXSIZE) {
      while (memoIdQueue.length >= MEMOIZE_NUMBERS_LIMIT) {
        console.warn('MEMOIZE_NUMBERS_LIMIT exceeded:', MEMOIZE_NUMBERS_LIMIT);
        delete memo[memoIdQueue.shift()];
      }

      memo[id] = object;

      memoIdQueue.push(id);
    }

    return callback(null, object);
  };

  if (path.existsSync(_getObjectPath(id))) {
    return _readObjectFromLoose(id, cb);
  } else {
    return _readObjectFromPack(id, cb);
  }
};

/**
 * 특정 commit에 속한 file의 정보를 보여준다.
 * @param filename
 * @param commitId
 * @param callback(err)
 */
var show = function(filename, id, callback) {
  readObject(id, function(err, commit) {
    if (err) throw err;
    readObject(commit.tree, function(err, tree) {
      if (tree[filename]) {
        readObject(tree[filename], function(err, content) {
          callback(err, content, commit);
        });
      } else {
        callback(new GitFsError("'" + filename + "' not found in the commit " + id));
      }
    });
  });
};

/**
 * 'query'의 `until` 에서 `offset` 만큼 떨어져있는 커밋을 찾는다.
 * 실제로 변경이 있었던 커밋만 로그에 포함시키기 위해, blob id 가 바뀌었는지 검사한다.
 *
 * Query:
 *     queryLog() 의 설명을 볼 것
 *     다만 `since` 는 무시된다.
 *
 * @param {Object} query
 * @param {Function} callback (err, id)
 * @private
 */
var _computeCommitOffset = function(query, callback) {
  if (query.offset < 0) {
    // query.until 부터 HEAD 까지의 커밋을 모두 얻어서,
    // query.until 에서 query.offset 만큼 떨어진 커밋을 돌려준다.
    getCommitIdFromHEAD(function(err, id) {
      _queryLog({
        filename: query.filename,
        until: id,
        since: query.until
      }, function(err, commits) {
        var index = commits.ids.length + query.offset;
        if (index < 0) {
          index = 0;
        }
        callback(err, commits.ids[index]);
      });
    });
  } else if (query.offset > 0) {
    // query.until과 그 parent commit들을,
    // query.until에 가까운 순으로 최대 query.offset + 1 개 만큼 얻은 뒤,
    // 가장 오래된 커밋을 돌려준다.
    _queryLog({
      filename: query.filename,
      until: query.until,
      limit: query.offset + 1
    }, function(err, commits) {
      callback(err, commits.ids[query.offset]);
    });
  } else {
    // query.until을 그대로 반환한다.
    callback(null, query.until);
  }
};

/**
 * `query`로 로그를 찾는다.
 *
 * Query:
 *     - `filename` 파일명 e.g.) 'frontpage'
 *     - `until` 가져올 커밋의 범위 (이 커밋까지) e.g.) 'f96845522d7a2de3c0c4677ac96f6640ceb19055'
 *     - `offset` until에 대한 offset (음수도 가능) e.g.) 1
 *     - `since` 가져올 커밋의 범위 (이 커밋 이후) e.g.) '0cc71c0002496eccbe919c2e5f4c0616f9f2e611'
 *     - `limit` 가져올 커밋의 최대 갯수. e.g.) 30
 *
 * @param {Query} query
 * @param {Function} callback (err, commits)
 */
var queryLog = function(query, callback) {
  var next = function() {
    _computeCommitOffset(query, function(err, id) {
      if (err) return callback(err, null);
      query.until = id;
      return _queryLog(query, callback);
    });
  };

  if (!query.until || query.until === 'HEAD') {
    return getCommitIdFromHEAD(function(err, head) {
      if (err) return callback(err, null);
      query.until = head;
      return next();
    });
  } else {
    return next();
  }
};

/**
 * `query`로 로그를 찾는다.
 * 실제로 변경이 있었던 커밋만 로그에 포함시키기 위해, blob id 가 바뀌었는지 검사한다.
 *
 * Query:
 *     queryLog() 의 설명을 볼 것
 *     다만 `offset` 은 무시된다.
 *
 * @param {Object} query
 * @param {Function} callback (err, commits)
 * @private
 */
var _queryLog = function(query, callback) {
  // This function does not consider query.offset. It should be processed
  // before calling this.
  var commit, empty;

  // Return an empty array if there is no need to find logs.
  if (query.limit === 0 || query.until == query.since) {
    empty = [];
    empty.ids = [];
    return callback(null, empty);
  }

  return readObject(query.until, function(err, commit) {
    if (err) return callback(err);

    var goNext = function(commits, newLimit, callback) {

      // Get logs until the current commit's parent
      // and merge them with the current logs.
      _queryLog({
        filename: query.filename,
        until: commit.parent,
        since: query.since,
        limit: newLimit
      }, function(err, nextCommits) {
        if (err) return callback(err);

        if (commits) {
          var ids = commits.ids.concat(nextCommits.ids);
          commits = commits.concat(nextCommits);
          commits.ids = ids;
          return callback(err, commits);
        } else {
          return callback(err, nextCommits);
        }
      });
    };

    var __getBlobId = function(treeId, cb) {

      // If commit.tree is memoized, get it using readObject.
      // Else determine whether commit.tree has a blob matched
      // query.filename using findInTree which is much faster than
      // readObject.
      if (memo[treeId]) {
        readObject(treeId, function(err, tree) {
          if (err) return callback(err);
          return cb(err, tree[query.filename]);
        });
      } else {
        findInTree(treeId, query.filename, function(err, blobId) {
          return cb(err, blobId);
        });
      }
    };

    return __getBlobId(commit.tree, function(err, blobId) {
      if (err) return callback(err);

      var commits = null;

      // FIXME: The if-clause below ignores a commit whose tree has
      // no blob matched query.filename. But for rename tracking and
      // deletion detecting, it shouldn't do that.
      if (!blobId) {
        return goNext(commits, query.limit, callback);
      }

      // If the current commit has a blob matched query.filename
      // but no parent. it means that the current commit is the root
      // commit and so the first commit at which the blob is created.
      if (!commit.parent) {
        commits = [commit];
        commits.ids = [query.until];
        return goNext(commits, query.limit - 1, callback);
      }

      // Read the parent of the current commit and add it into commits
      // if its blob matched query.filename is not identical with
      // the current commit's blob matched query.filename.
      return readObject(commit.parent, function(err, parentCommit) {
        if (err) return callback(err);

        return __getBlobId(parentCommit.tree, function(err, nextBlobId) {
          if (blobId != nextBlobId) {
            commits = [commit];
            commits.ids = [query.until];
            return goNext(commits, query.limit - 1, callback);
          } else {
            return goNext(commits, query.limit, callback);
          }
        });
      });
    });

  });
};

/**
 * filename을 기준으로 로그 출력
 * @param filename
 * @param callback
 */
var log = function(filename, limit, callback) {
  getCommitIdFromHEAD(function(err, id) {
    return _queryLog({
      filename: filename,
      until: id,
      limit: limit
    }, callback);
  });
};

/**
 * Head Commit의 tree 객체를 콜백으로 넘긴다.
 * @param callback (err, tree)
 */
var getHeadTree = function(callback) {
  getCommitIdFromHEAD(function(err, id) {
    readObject(id, function(err, commit) {
      return readObject(commit.tree, callback);
    });
  });
};

var getHeadCommit = function(callback) {
  getCommitIdFromHEAD(function(err, id) {
    if (err) return callback(err);
    return readObject(id, callback);
  });
};

var pendingToCommit = {};

/**
 * add target to commit
 *
 * @param target =  {
 *              path: ...
 *              name: ...
 *              content: ...
 *          }
 */
var add = function(user, target) {
  var keyname = target.path + "/" + target.name;
  pendingToCommit.user = pendingToCommit.user || {};
  pendingToCommit.user[user.email] = pendingToCommit.user[user.email] || {};
  pendingToCommit.user[user.email][keyname] = target;
};

/**
 * git status : 특정 유저의 커밋 대상(pendingToCommit) 목록
 * @param user
 * @return status =  {
 *                      'note/Welcome': {
 *                        path: 'note',
 *                        name: 'Welcome',
 *                        content: 'Welcome to n4wiki'
 *                      },
 *                      ...
 *                    }
 */
var status = function(user) {
  pendingToCommit.user = pendingToCommit.user || {};
  return pendingToCommit.user[user.email];
};

var resetToBeforeAdd = function(user) {
  pendingToCommit.user = pendingToCommit.user || {};
  pendingToCommit.user[user.email] = {}
};

var commitAll = function(user, callback){
  var status = this.status(user);
  var files = {};
  for (var key in status) {
    files[status[key].name] = status[key].content;
  }
  var request = {
    files: files,
    user: user,
    message: 'commit pendings'
  };

  this.commit(request, function(err, commitId){
    callback(err, commitId);
  });
};

var setRepoPath = function(path) {
  REPO_PATH = path;
};

var getRepoPath = function() {
  return REPO_PATH;
};

var _getBlobId = function(name, commitId, callback) {
  readObject(commitId, function(err, commit) {
    readObject(commit.tree, function(err, blobs) {
      callback(err, blobs[name]);
    });
  });
};

var _diff = function(name, a, b, type, callback) {
  switch (type) {
  case 'unified':
    return callback(null, jsdiff.createPatch(name, a, b));
  case 'json':
  default:
    return callback(null, jsdiff.diffLines(a, b));
  }
};

/**
 * Get the difference between the pages in two reivisions.
 *
 * The `type` value may be a single string such as "json"
 * or an array such as `["json", "unified", "bool"]`.
 *
 * * `json`: json
 * * `unified`: unified diff
 * * `bool`: true if the two pages are identical, false if not.
 *
 * The return value may be a single string if `type` is
 * also single string, or an Object if given `type` is an array.
 *
 * Examples:
 *      a = "289e51ec91fe50c5502383efd435ee1166fc3001";
 *      b = "44ba23b69a70768a3a71f4a29975f1b4b74a12d8";
 *
 *      diff = gitfs.diff('frontpage', a, b, 'json');
 *      diffs = gitfs.diff('frontpage', a, b, ['json', 'unified']);
 *
 * @param {String} name
 * @param {String} a
 * @param {String} b
 * @param {String|Array} type(s)
 * @return {String|Object}
 * @api public
 */
var diff = function(name, a, b, types_, callback) {
  var types = (types_ instanceof Array) ? types_ : [types_];
  var results = {};

  async.forEach(types, function(type, cb) {
    switch (type) {
    case 'bool':
      return _getBlobId(name, a, function(err, blobA) {
        _getBlobId(name, b, function(err, blobB) {
          results[type] = (blobA == blobB);
          return cb();
        });
      });
    case 'unified':
    case 'json':
    default:
      return show(name, a, function(err, contentA) {
        show(name, b, function(err, contentB) {
          var A = contentA.toString();
          var B = contentB.toString();
          _diff(name, A, B, type, function(err, diff) {
            results[type] = diff;
            return cb();
          });
        });
      });
    }
  }, function(err) {
    if (types_ instanceof Array) {
      return callback(err, results);
    } else {
      return callback(err, _.values(results)[0]);
    }
  });
};

exports._serializeCommit = _serializeCommit;
exports._serializeTree = _serializeTree;
exports._serializeBlob = _serializeBlob;
exports._storeObject = _storeObject;
exports._createObjectBucket = _createObjectBucket;
exports._hash = _hash;

exports.add = add;
exports.status = status;
exports.getHeadTree = getHeadTree;
exports.getHeadCommit = getHeadCommit;
exports.init = init;
exports.commit = commit;
exports.readObject = readObject;
exports.show = show;
exports.log = log;
exports.queryLog = queryLog;
exports.setRepoPath = setRepoPath;
exports.getRepoPath = getRepoPath;
exports.diff = diff;
exports.getCommitIdFromHEAD = getCommitIdFromHEAD;
exports.createCommitFromTree = createCommitFromTree;
exports.commitAll = commitAll;
exports.resetToBeforeAdd = resetToBeforeAdd;

/**
 * GitFs Error
 * @param message
 * @constructor
 */
var GitFsError = function(message){
  this.name = "GitFsError";
  this.message = message || "GitFs Error occurred!";
};

GitFsError.prototype = new GitFsError();
GitFsError.prototype.constructor = GitFsError;
