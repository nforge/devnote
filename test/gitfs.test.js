var libpath = process.env['LIB_COV'] ? '../lib-cov' : '../lib';
var assert = require('assert');
var gitfs = require(libpath + '/gitfs');
var async = require('async');
var fs = require('fs');
var step = require('step');
var crypto = require('crypto');
var path = require('path');
var zlib = require('zlib');
var fileutils = require(libpath + '/fileutils');
var util = require('util');
var debug = require('debug');

// var WIKINAME = 'note';
var REPO_PATH = 'note.pages.git';

//  $ mkdir -p ./pages.git/objects
//     $ mkdir -p ./pages.git/refs
//     $ echo 'ref: refs/heads/master' > ./pages.git/HEAD
//     - 확인: 폴더 정상적으로 생성되었는지 여부
var _ifExistsSync = function(file, func) {
  if (fs.existsSync(file)) {
    return func(file);
  }
}

suite('gitfs.init', function() {
  setup(function(done) {
    fileutils.rm_rf(REPO_PATH);
    done();
  });
  test('필요한 디렉터리와 파일이 생성되어야 함', function(done) {
    step(function when() {
      gitfs.init(REPO_PATH, this);
    }, function then(err) {
      if (err) throw err;
      assert.ok(fs.statSync(REPO_PATH + '/objects').isDirectory());
      assert.ok(fs.statSync(REPO_PATH + '/refs').isDirectory());
      assert.equal('ref: refs/heads/master', fs.readFileSync(REPO_PATH + '/HEAD', 'utf8'));
      done();
    });
  });
  test('이미 폴더가 존재할 경우 안내 메시지 출력', function(done) {
    step(function given() {
      fs.mkdir(REPO_PATH, this);
    }, function when(err) {
      gitfs.init(REPO_PATH, this);
    }, function then(err) {
      if (err) {
        assert.equal(REPO_PATH + " already exists", err.message);
        done();
      } else {
        assert.fail('fail!');
      }
    });
  });
  teardown(function(done) {
    fileutils.rm_rf(REPO_PATH);
    done();
  });
});

suite('gitfs._serializeBlob', function() {
  var content;
  setup(function(done) {
    content = 'wiki-content';

    gitfs.init(REPO_PATH, function(err) {
      if (err) throw err;
      done();
    });
  });
  test('blob object 객체 생성', function(done) {
    var blob;
    step(

    function when() {
      blob = gitfs._serializeBlob(content);
      this();
    }, function then(err) {
      if (err) throw err;
      assert.equal('blob ' + content.length + '\0' + content, blob);
      done();
    });
  });
  test('이 blob object에 대한 hexdigit sha1 해시값 계산', function(done) {
    var blob = gitfs._serializeBlob(content);
    var id = crypto.createHash('sha1');
    id.update(blob);
    assert.equal(id.digest('hex'), gitfs._hash(blob));
    done();
  });

  test(REPO_PATH + '/objects/<sha1 해시값 앞 2자리> 폴더 생성', function(done) {
    var digest;
    var bucketPath = REPO_PATH + '/objects/f2';
    step(function given() {
      var blob = gitfs._serializeBlob(content);
      var id = crypto.createHash('sha1');
      id.update(blob);
      digest = id.digest('hex');
      this();
    }, function when(err) {
      if (err) throw err;
      gitfs._createObjectBucket(digest, this);
    }, function then(err) {
      if (err) throw err;
      assert.ok(fs.existsSync(bucketPath));
      done();
    });
  });
  teardown(function(done) {
    fileutils.rm_rf(REPO_PATH);
    done();
  });
});

suite('gitfs._storeObject', function() {
  setup(function(done) {
    gitfs.init(REPO_PATH, function(err) {
      if (err) throw err;
      done();
    });
  });
  test('Git object를 sha1 해시값에서 앞 두글자를 제외한 38자리 이름의 파일을 deflate로 압축하여 저장', function(done) {
    var blobPath;
    var content = 'wiki-content\n';
    step(function given() {
      var raw = gitfs._serializeBlob(content);
      var digest = gitfs._hash(raw);
      blobPath = REPO_PATH + '/objects/' + digest.substr(0, 2) + '/' + digest.substr(2);
      this();
    }, function when(err) {
      if (err) throw err;
      gitfs._storeObject(gitfs._serializeBlob(content), this);
    }, function then(err) {
      if (err) throw err;
      var actualBlob = fs.readFileSync(blobPath);
      zlib.inflate(fs.readFileSync(blobPath), function(err, result) {
        assert.deepEqual(result, new Buffer('blob 13\0wiki-content\n'));
        done();
      });
    });
  });
  teardown(function(done) {
    fileutils.rm_rf(REPO_PATH);
    done();
  });
});

suite('gitfs._serializeTree', function() {
  var tree;
  var expectedTree;

  setup(function(done) {
    fileutils.rm_rf(REPO_PATH);

    var digest1 = crypto.createHash('sha1').update('content1').digest('hex');
    var digest2 = crypto.createHash('sha1').update('content2').digest('hex');

    var SHA1SUM_DIGEST_BINARY_LENGTH = 20;
    var header = 'tree 66\0';
    var length = 0;
    var offset = 0;

    length += header.length;
    length += ('100644 page1\0'.length + SHA1SUM_DIGEST_BINARY_LENGTH);
    length += ('100644 page2\0'.length + SHA1SUM_DIGEST_BINARY_LENGTH);

    expectedTree = new Buffer(length);

    expectedTree.write(header);
    offset += header.length
    expectedTree.write("100644 page1\0", offset);
    offset += "100644 page1\0".length;
    new Buffer([0x10, 0x5e, 0x7a, 0x84, 0x4a, 0xc8, 0x96, 0xf6, 0x8e, 0x6f, 0x7d, 0xc0, 0xa9, 0x38, 0x9d, 0x3e, 0x9b, 0xe9, 0x5a, 0xbc]).copy(expectedTree, offset);
    offset += 20;
    expectedTree.write("100644 page2\0", offset);
    offset += "100644 page2\0".length;
    new Buffer([0x6d, 0xc9, 0x9d, 0x47, 0x57, 0xbc, 0xb3, 0x5e, 0xaa, 0xf4, 0xcd, 0x3c, 0xb7, 0x90, 0x71, 0x89, 0xfa, 0xb8, 0xd2, 0x54]).copy(expectedTree, offset);

    tree = {
      'page2': digest2,
      'page1': digest1
    };

    done();
  });

  test('생성된 모든 blob object에 대한 참조를 갖는 정렬된 tree object 생성', function(done) {
    // when & then
    assert.equal(gitfs._serializeTree(tree).toString(), expectedTree.toString());
    done();
  });

  teardown(function(done) {
    fileutils.rm_rf(REPO_PATH);
    done();
  });
});

suite('gitfs.getCommitIdFromHEAD', function() {
  setup(function(done) {
    fileutils.mkdir_p(REPO_PATH + '/refs/heads');
    fs.writeFileSync(REPO_PATH + '/HEAD', 'ref: refs/heads/master');
    fs.writeFileSync(REPO_PATH + '/refs/heads/master', 'f2c0c508c21b3a49e9f8ffdc82277fb5264fed4f');
    done();
  });
  test('HEAD 파일이 존재하지 않을 때 예외처리', function(done) {
    step(function when() {
      _ifExistsSync(REPO_PATH + '/HEAD', fs.unlinkSync);
      gitfs.getCommitIdFromHEAD(this);
    }, function then(err) {
      assert.equal('HEAD does not exist', err.message);
      done();
    });
  });
  test('HEAD 파일 참조 읽어오기', function(done) {
    step(function when() {
      gitfs.getCommitIdFromHEAD(this);
    }, function then(err, parentId) {
      assert.equal('f2c0c508c21b3a49e9f8ffdc82277fb5264fed4f', parentId);
      done();
    });
  });
  teardown(function(done) {
    fileutils.rm_rf(REPO_PATH);
    done();
  });
});

suite('gitfs._serializeCommit', function() {
  var commit;
  var expectedCommit;
  setup(function() {
    commit = {
      tree: '635a6d85573c97658e6cd4511067f2e4f3fe48cb',
      parent: '0cc71c0002496eccbe919c2e5f4c0616f9f2e611',
      author: 'Yi, EungJun <semtlenori@gmail.com> 1333091842 +0900',
      committer: 'Yi, EungJun <semtlenori@gmail.com> 1333091842 +0900',
      message: 'Remove duplication between gitfs.createTreeRaw() and its test.\n'
    };

    expectedCommit = 'commit 279' + '\0';
    expectedCommit += 'tree 635a6d85573c97658e6cd4511067f2e4f3fe48cb\n';
    expectedCommit += 'parent 0cc71c0002496eccbe919c2e5f4c0616f9f2e611\n';
    expectedCommit += 'author Yi, EungJun <semtlenori@gmail.com> 1333091842 +0900\n';
    expectedCommit += 'committer Yi, EungJun <semtlenori@gmail.com> 1333091842 +0900\n\n';
    expectedCommit += 'Remove duplication between gitfs.createTreeRaw() and its test.\n';
  });
  test('commit object 생성', function() {
    var actualCommit = gitfs._serializeCommit(commit);
    assert.equal(actualCommit, expectedCommit);
  });
  test('생성된 commit object를 압축해서 저장', function(done) {
    gitfs.init(REPO_PATH, function(err) {
      if (err) throw err;
      var digest = crypto.createHash('sha1').update(expectedCommit, 'binary').digest('hex');
      var commitPath = path.join(REPO_PATH, 'objects', digest.substr(0, 2), digest.substr(2));
      gitfs._storeObject(gitfs._serializeCommit(commit), function(err) {
        if (err) throw err;
        zlib.inflate(fs.readFileSync(commitPath), function(err, result) {
          if (err) throw err;
          assert.deepEqual(result, new Buffer(expectedCommit));
          done();
        });
      });
    });
  });
  teardown(function(done) {
    fileutils.rm_rf(REPO_PATH);
    done();
  });
});

// 5. .git/refs/heads/master 를 생성한 commit object 의 id 로 갱신
suite('gitfs.commit', function() {
  var givenCommit;
  var files, user;
  setup(function(done) {
    files = {
      'FrontPage': 'Welcome to n4wiki'
    };
    user = {
      name: "nekure",
      id: "racoon",
      email: "nekure@gmail.com",
      timezone: '+0900'
    };
    givenCommit = {
      files: files,
      user: user,
      message: "initial commit"
    };

    gitfs.init(REPO_PATH, function(err) {
      if (err) throw err;
      done();
    });
  });
  test('Welcome to n4wiki 라는 내용을 갖는 FrontPage 파일을 commit함', function(done) {
    gitfs.commit(givenCommit, function(err, commitId) {
      gitfs.readObject(commitId, function(err, commit) {
        assert.equal(commit.author.name, givenCommit.user.name);
        assert.equal(commit.author.email, givenCommit.user.email);
        assert.equal(commit.author.timezone, givenCommit.user.timezone);

        assert.equal(commit.committer.name, givenCommit.user.name);
        assert.equal(commit.committer.email, givenCommit.user.email);
        assert.equal(commit.committer.timezone, givenCommit.user.timezone);

        assert.equal(commit.message, givenCommit.message);
        gitfs.readObject(commit.tree, function(err, tree) {
          gitfs.readObject(tree['FrontPage'], function(err, blob) {
            if (err) throw err;
            assert.equal(blob, givenCommit.files['FrontPage']);
            done();
          });
        });
      });
    });
  });

  test('commit이 완료되면 HEAD가 가리키는 커밋 아이디가 갱신됨', function(done) {
    gitfs.commit(givenCommit, function(err, commitId) {
      gitfs.getCommitIdFromHEAD(function(err, id) {
        if (err) throw err;
        assert.equal(id, commitId);
        done();
      });
    });
  });

  teardown(function(done) {
    fileutils.rm_rf(REPO_PATH);
    done();
  });
});

suite('gitfs.show', function() {
  test('Welcome to n4wiki 라는 내용이 담긴 커밋된 FrontPage 파일을 읽음', function(done) {
    //Given
    var files = {
      'FrontPage': 'Welcome to n4wiki'
    };
    var user = {
      name: "Yi, EungJun",
      id: "semtlenori",
      email: "semtlenori@gmail.com",
      timezone: '+0900'
    };

    var givenCommit = {
      files: files,
      user: user,
      message: 'initial commit'
    };

    //When
    gitfs.init(REPO_PATH, function(err) {
      gitfs.commit(givenCommit, function(err) {
        gitfs.getCommitIdFromHEAD(function(err, commitId) {
          gitfs.show('FrontPage', commitId, function(err, actual) {
            //Then
            assert.equal(actual, 'Welcome to n4wiki');
            done();
          });
        });
      });
    });
  });

  test('두 개의 파일을 커밋하고 내용을 읽음', function(done) {
    //Given
    var files = {
      'FrontPage': 'Welcome to n4wiki',
      'Index': 'List of all pages'
    };
    var user = {
      name: "Yi, EungJun",
      id: "semtlenori",
      email: "semtlenori@gmail.com",
      timezone: '+0900'
    };

    var givenCommit = {
      files: files,
      user: user,
      message: 'initial commit'
    };

    gitfs.init(REPO_PATH, function(err) {
      gitfs.commit(givenCommit, function(err) {
        gitfs.getCommitIdFromHEAD(function(err, commitId) {
          gitfs.show('Index', commitId, function(err, actual) {
            assert.equal(actual, 'List of all pages');
            done();
          });
        });
      });
    });
  });
  teardown(function(done) {
    fileutils.rm_rf(REPO_PATH);
    done();
  });
});

suite('gitfs.log', function() {
  var givenCommits;

  setup(function(done) {
    var filesFor1stCommit = {
      'FrontPage': 'Welcome'
    };
    var filesFor2ndCommit = {
      'FrontPage': 'Welcome to n4wiki',
      'Index': 'List of all pages'
    };

    var user = {
      name: "Yi, EungJun",
      id: "semtlenori",
      email: "semtlenori@gmail.com",
      timezone: '+0900'
    };

    var firstCommit = {
      files: filesFor1stCommit,
      user: user,
      message: 'the first commit'
    };

    var secondCommit = {
      files: filesFor2ndCommit,
      user: user,
      message: 'the second commit'
    };

    givenCommits = [firstCommit, secondCommit];
    gitfs.init(REPO_PATH, function(err) {
      async.forEachSeries(givenCommits, function(commit, cb) {
        gitfs.commit(commit, cb);
      }, done);
    });
  });

  test('두 번 커밋된 FrontPage 페이지의 히스토리 가져오기', function(done) {
    gitfs.log('FrontPage', null, function(err, actual) {
      if (err) throw err;
      assert.equal(actual.length, 2);
      assert.equal(actual[0].commit.message, givenCommits[1].message);
      assert.equal(actual[1].commit.message, givenCommits[0].message);
      done();
    });
  });

  test('두번째 커밋때 추가된 Index 페이지의 히스토리 가져오기', function(done) {
    gitfs.log('Index', null, function(err, actual) {
      if (err) throw err;
      assert.equal(actual.length, 1);
      assert.equal(actual[0].commit.message, givenCommits[1].message);
      done();
    });
  });

  test('새로운 사람에 의해 세 번째 커밋이 일어났을 때 히스토리 가져오기', function(done) {
    var writer = {
      name: 'nFORGE',
      id: 'n4wiki',
      mail: 'n4wiki@nhn.com',
      timezone: '+0900'
    };
    step(function given() {
      var thirdCommit = {
        files: {
          'FrontPage': 'Welcome to n4wiki',
          'Index': 'List of all pages',
          'README': 'License agreements'
        },
        user: writer,
        message: 'Added license message'
      }
      gitfs.commit(thirdCommit, this);
    }, function when() {
      gitfs.log('README', null, this);
    }, function then(err, actual) {
      if (err) throw err;
      assert.equal(actual.length, 1);
      assert.equal(actual[0].commit.author.name, writer.name);
      done();
    })
  });

  teardown(function() {
    fileutils.rm_rf(REPO_PATH);
  });

});

suite('gitfs.log (pack)', function() {
  var gitRoot = 'test/resources/pack.git_fixture';
  var originalGitRoot;

  setup(function() {
    originalGitRoot = gitfs.getRepoPath();
    gitfs.setRepoPath(gitRoot);
  });

  test('커밋 로그를 에러없이 가져온다.', function(done) {
    step(function when() {
      gitfs.log('test', null, this);
    }, function then(err, logs) {
      if (err) throw err;
      assert.equal(logs.length, 30);
      done();
    });
  });

  teardown(function() {
    gitfs.setRepoPath(originalGitRoot);
  });
});

suite('gitfs.queryLog', function() {
  setup(function(done) {
    gitfs.init(REPO_PATH, function(err) {
      if (err) throw err;
      step(function() {
        var commitRequest = {
          files: {
            'frontpage': 'welcome to n4wiki'
          },
          user: {
            name: 'Guest',
            mail: 'guest@n4wiki.com',
            timezone: '+0900'
          },
          message: 'Edit frontpage'
        };
        gitfs.commit(commitRequest, this);
      }, function() {
        var commitRequest = {
          files: {
            'SecondPage': 'hello'
          },
          user: {
            name: 'Guest',
            mail: 'guest@n4wiki.com',
            timezone: '+0900'
          },
          message: 'hello'
        };
        gitfs.commit(commitRequest, this);
      }, function() {
        var commitRequest = {
          files: {
            'SecondPage': 'hello, world'
          },
          user: {
            name: 'Guest',
            mail: 'guest@n4wiki.com',
            timezone: '+0900'
          },
          message: 'hello, world'
        };
        gitfs.commit(commitRequest, this);
      }, function() {
        var commitRequest = {
          files: {
            'SecondPage': 'bye'
          },
          user: {
            name: 'Guest',
            mail: 'guest@n4wiki.com',
            timezone: '+0900'
          },
          message: 'bye'
        };
        gitfs.commit(commitRequest, done);
      });
    });
  });

  test('커밋로그를 지정한 갯수만큼만 가져오기', function(done) {
    gitfs.log('SecondPage', 2, function(err, commits) {
      assert.equal(commits.length, 2);
      assert.equal(commits[0].commit.message, 'bye');
      assert.equal(commits[1].commit.message, 'hello, world');
      done();
    });
  });

  test('지정한 시점까지의 커밋로그 가져오기 (offset > 0)', function(done) {
    var expected;

    step(function given() {
      var next = this;
      gitfs.log('SecondPage', null, function(err, commits) {
        expected = [commits[2]];
        expected.ids = [commits.ids[2]];
        next(err, commits);
      });
    }, function when(err, commits) {
      gitfs.queryLog({
        filename: 'SecondPage',
        until: commits.ids[1],
        offset: 1
      }, this);
    }, function then(err, commits) {
      assert.equal(commits.length, 1);
      assert.deepEqual(commits[0].commit, expected[0].commit);
      assert.deepEqual(commits.ids, expected.ids);
      done();
    });
  });

  test('지정한 시점까지의 커밋로그 가져오기 (offset < 0)', function(done) {
    var expected;

    step(function given() {
      var next = this;
      gitfs.log('SecondPage', null, function(err, commits) {
        expected = [commits[1], commits[2]];
        expected.ids = [commits.ids[1], commits.ids[2]];
        next(err, commits);
      });
    }, function when(err, commits) {
      gitfs.queryLog({
        filename: 'SecondPage',
        until: commits.ids[2],
        offset: -1
      }, this);
    }, function then(err, commits) {
      assert.equal(commits.length, 2);
      assert.deepEqual(commits[0].commit, expected[0].commit);
      assert.deepEqual(commits[1].commit, expected[1].commit);
      assert.deepEqual(commits.ids, expected.ids);
      done();
    });
  });

  test('지정한 시점부터의 커밋로그 가져오기', function(done) {
    var expected;

    step(function given() {
      var next = this;
      gitfs.log('SecondPage', 2, function(err, commits) {
        expected = [commits[0]];
        expected.ids = [commits.ids[0]];
        next(err, commits);
      });
    }, function when(err, commits) {
      gitfs.queryLog({
        filename: 'SecondPage',
        since: commits.ids[1]
      }, this);
    }, function then(err, commits) {
      assert.equal(commits.length, 1);
      assert.deepEqual(commits[0].commit, expected[0].commit);
      assert.deepEqual(commits.ids, expected.ids);
      done();
    });
  });

  teardown(function(done) {
    fileutils.rm_rf(REPO_PATH);
    done();
  });
});

suite('gitfs.getHeadTree', function() {
  var givenCommits;

  setup(function(done) {
    var firstCommit = {
      files: {
        'My Diary': 'I have a busy day!'
      },
      user: {
        name: 'CHAE.SW',
        id: 'doortts',
        mail: 'doortts@gmail.com',
        timezone: '+0900'
      },
      message: 'diary added'
    }

    givenCommits = [firstCommit];
    gitfs.init(REPO_PATH, function(err) {
      async.forEachSeries(givenCommits, function(commit, cb) {
        gitfs.commit(commit, cb);
      }, done);
    });
  });
  test('HEAD commit 가져오기', function(done) {
    var writer = {
      name: 'CHAE.SW',
      id: 'doortts',
      mail: 'doortts@gmail.com',
      timezone: '+0900'
    };
    var expectedtree = {
      "My Diary": new Buffer("f0088144f8ddcebcaef23def5467d45c2adcdb63", 'hex'),
      "README": new Buffer("6a1fea92897468a77a436724ae3306891f19b60c", 'hex')
    };
    step(function given() {
      var commit = {
        files: {
          'README': 'License agreements'
        },
        user: writer,
        message: 'Added license message'
      }
      gitfs.commit(commit, this);
    }, function when(err, commitId) {
      gitfs.getHeadTree(this);
    }, function then(err, tree) {
      assert.deepEqual(tree, expectedtree);
      done();
    })
  });
  teardown(function(done) {
    fileutils.rm_rf(REPO_PATH);
    done();
  });
});

suite('assert.json.equal', function() {
  test('두 json이 서로 일치할 때', function() {
    var expected = {
      name: "John",
      email: "john@gamail.com"
    };
    //       var actual = {name: "Jane", email: "jane@gamail.com"};
    var actual = "name";

    assert.json = {};
    assert.json.equal = function(actual, expected) {
      try {
        JSON.stringify(actual);
      } catch (e) {
        throw new assert.AssertionError({
          message: actual + 'is Not Json',
          actual: actual,
          expected: expected
        });
      }
    };
    assert.json.equal(actual, expected);
  })
});

suite('gitfs.add', function(){
      var user = {
        name: "채수원",
        email: "dorrtts@gmail.com",
        id: "doortts",
        password: "1234"
    };

    setup(function() {
      gitfs.resetToBeforeAdd(user);
    });

    test('새로운 커밋대상을 추가하기',function(){
        //Given
        var target = {
            path: "note",
            name: "Welcome",
            content: "Welcome to n4wiki"
        };

        //When
        gitfs.add(user, target);

        //Then
        var status = gitfs.status(user);
        assert.deepEqual(Object.keys(status), [target.path + "/" + target.name]);
    });

    test('여러 개의 커밋대상을 추가하기',function(){
        //Given
        var targetA = {
            path: "note",
            name: "Welcome",
            content: "Welcome to n4wiki"
        };

        var targetB = {
            path: "note",
            name: "Diary",
            content: "오늘은 매우 바뻤다.머리도 지끈."
        };

        var user = {
          name: "nekure",
          id: "racoon",
          email: "nekure@gmail.com",
          timezone: '+0900'
        };

        //When
        gitfs.add(user, targetA);
        gitfs.add(user, targetB);

        //Then
        var status = gitfs.status(user);
        assert.deepEqual(Object.keys(status), [targetA.path + "/" + targetA.name, targetB.path + "/" + targetB.name]);
        assert.deepEqual(status[targetA.path + "/" + targetA.name], targetA);
    });
});

