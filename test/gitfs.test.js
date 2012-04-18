var assert = require('assert');
var gitfs = require('../lib/gitfs');
var async = require('async');
var fs = require('fs');
var step = require('step');
var crypto = require('crypto');
var path = require('path');
var zlib = require('zlib');
var fileutils = require('../lib/fileutils');

//  $ mkdir -p ./pages.git/objects
//     $ mkdir -p ./pages.git/refs
//     $ echo 'ref: refs/heads/master' > ./pages.git/HEAD
//     - 확인: 폴더 정상적으로 생성되었는지 여부

var _ifExistsSync = function(file, func) {
    if (path.existsSync(file)) {
        return func(file);
    }
}

suite('gitfs.init', function(){
    setup(function(done) {
        fileutils.rm_rf('pages.git');
        done();
    });
    test('필요한 디렉터리와 파일이 생성되어야 함', function(done){
        step(
            function when() {
                gitfs.init(this);
            },
            function then(err) {
                if (err) throw err;
                assert.ok(fs.statSync('./pages.git/objects').isDirectory());
                assert.ok(fs.statSync('./pages.git/refs').isDirectory());
                assert.equal('ref: refs/heads/master', fs.readFileSync('./pages.git/HEAD', 'utf8'));
                done();
            }
        )
    });
    test('이미 폴더가 존재할 경우 안내 메시지 출력', function(done){
        step(
            function given(){
                fs.mkdir('./pages.git', this);
            },
            function when(err) {
                gitfs.init(this);
            },
            function then(err) {
                if (err) {
                    assert.equal("pages.git already exists", err.message);
                    done();
                } else {
                    assert.fail('fail!');
                }
            }
        );
    });
    teardown(function(done) {
        fileutils.rm_rf('pages.git');
        done();
    });
});

suite('gitfs._serializeBlob', function() {
    var content;
    setup(function(done) {
        content = 'wiki-content';

        gitfs.init(function (err) {
            if (err) throw err;
            done();
        });
    });
    test('blob object 객체 생성', function(done) {
        var blob;
        step(
            function when() {
                blob=gitfs._serializeBlob(content);
                this();
            },
            function then(err) {
                if (err) throw err;
                assert.equal('blob ' + content.length + '\0' + content, blob);
                done();
            }
        );
    });
    test('이 blob object에 대한 hexdigit sha1 해시값 계산', function(done) {
        var blob = gitfs._serializeBlob(content);
        var id = crypto.createHash('sha1');
        id.update(blob);
        assert.equal(id.digest('hex'), gitfs._hash(blob));
        done();
    });

    test('pages.git/objects/<sha1 해시값 앞 2자리> 폴더 생성', function(done) {
        var digest;
        var bucketPath = 'pages.git/objects/f2';
        step(
            function given() {
                var blob = gitfs._serializeBlob(content);
                var id = crypto.createHash('sha1');
                id.update(blob);
                digest = id.digest('hex');
                this();
            },
            function when(err) {
                if (err) throw err;
                gitfs._createObjectBucket(digest, this);
            },
            function then(err) {
                if (err) throw err;
                assert.ok(path.existsSync(bucketPath));
                done();
            }
        );
    });
    teardown(function(done) {
        fileutils.rm_rf('pages.git');
        done();
    });
});

suite('gitfs._storeObject', function() {
    setup(function(done) {

        gitfs.init(function (err) {
            if (err) throw err;
            done();
        });
    });
    test('Git object를 sha1 해시값에서 앞 두글자를 제외한 38자리 이름의 파일을 deflate로 압축하여 저장', function(done) {
        var blobPath;
        var expectedBlob;
        var content = 'wiki-content\n';
        step(
            function given() {
                var raw = gitfs._serializeBlob(content);
                var digest = gitfs._hash(raw);
                blobPath = 'pages.git/objects/' + digest.substr(0, 2) + '/' + digest.substr(2);
                this();
            },
            function when(err) {
                if (err) throw err;
                gitfs._storeObject(gitfs._serializeBlob(content), this);
            },
            function then(err) {
                if (err) throw err;
                var actualBlob = fs.readFileSync(blobPath);
                zlib.inflate(fs.readFileSync(blobPath), function(err, result) {
                    assert.deepEqual(result, new Buffer('blob 13\0wiki-content\n'));
                    done();
                });
            }
        );
    });
    teardown(function(done) {
        fileutils.rm_rf('pages.git');
        done();
    });
});

suite('gitfs._serializeTree', function(){
    var tree;
    var expectedTree;

    setup(function (done) {
        fileutils.rm_rf('pages.git');

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

        tree = {'page1': digest1, 'page2': digest2};

        done();
    });

    test('생성된 모든 blob object에 대한 참조를 갖는 tree object 생성', function(done) {
        // when & then
        assert.equal(gitfs._serializeTree(tree).toString(), expectedTree.toString());
        done();
    });

    teardown(function(done) {
        fileutils.rm_rf('pages.git');
        done();
    });
});

suite('gitfs._getCommitIdFromHEAD', function(){
    setup(function(done) {
        fileutils.mkdir_p('pages.git/refs/heads');
        fs.writeFileSync('pages.git/HEAD','ref: refs/heads/master');
        fs.writeFileSync('pages.git/refs/heads/master','f2c0c508c21b3a49e9f8ffdc82277fb5264fed4f');
        done();
    });
    test('HEAD 파일이 존재하지 않을 때 예외처리', function(done) {
        step(
            function when(){
                _ifExistsSync('pages.git/HEAD', fs.unlinkSync);
                gitfs._getCommitIdFromHEAD(this);
            },
            function then(err) {
                assert.equal('HEAD does not exist', err.message);
                done();
            }
        );
    });
    test('HEAD 파일 참조 읽어오기', function(done) {
        step(
            function when() {
                gitfs._getCommitIdFromHEAD(this);
            },
            function then(err, parentId) {
                assert.equal('f2c0c508c21b3a49e9f8ffdc82277fb5264fed4f', parentId);
                done();
            }
        );
    });
    teardown(function(done) {
        fileutils.rm_rf('pages.git');
        done();
    });
});

suite('gitfs._serializeCommit', function(){
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
        gitfs.init(function (err) {
            if (err) throw err;
            var digest = crypto.createHash('sha1').update(expectedCommit, 'binary').digest('hex');
            var commitPath = path.join('pages.git', 'objects', digest.substr(0, 2), digest.substr(2));
            gitfs._storeObject(gitfs._serializeCommit(commit), function (err) {
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
        fileutils.rm_rf('pages.git');
        done();
	});
});

// 5. .git/refs/heads/master 를 생성한 commit object 의 id 로 갱신

suite('gitfs.commit', function(){
    var givenCommit;
    var expectedCommit;
    setup(function(done){
        givenCommit = {
            files: {'FrontPage': 'Welcome to n4wiki'},
            author: {name: 'Yi, EungJun', mail: 'semtlenori@gmail.com', timezone: '+0900'},
            committer: {name: 'Yi, EungJun', mail: 'semtlenori@gmail.com', timezone: '+0900'},
            message: 'initial commit'
            };
        gitfs.init(done);
    });
    test('Welcome to n4wiki 라는 내용을 갖는 FrontPage 파일을 commit함', function(done){
        gitfs.commit(givenCommit, function(err, commitId) {
            gitfs.readObject(commitId, function(err, commit) {
                assert.equal(commit.author.name, givenCommit.author.name);
                assert.equal(commit.author.mail, givenCommit.author.mail);
                assert.equal(commit.author.timezone, givenCommit.author.timezone);

                assert.equal(commit.committer.name, givenCommit.committer.name);
                assert.equal(commit.committer.mail, givenCommit.committer.mail);
                assert.equal(commit.committer.timezone, givenCommit.committer.timezone);

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

    test('commit이 완료되면 HEAD가 가리키는 커밋 아이디가 갱신됨', function(done){
        gitfs.commit(givenCommit, function(err, commitId) {
            gitfs._getCommitIdFromHEAD(function (err, id) {
                if (err) throw err;
                assert.equal(id, commitId);
                done();
            });
        });
    });

    teardown(function(done) {
        fileutils.rm_rf('pages.git');
        done();
	});
});

suite('gitfs.show', function() {
    test('Welcome to n4wiki 라는 내용이 담긴 커밋된 FrontPage 파일을 읽음', function(done) {
        var givenCommit = {
            files: {'FrontPage': 'Welcome to n4wiki'},
            author: {name: 'Yi, EungJun', mail: 'semtlenori@gmail.com', timezone: '+0900'},
            committer: {name: 'Yi, EungJun', mail: 'semtlenori@gmail.com', timezone: '+0900'},
            message: 'initial commit'
        };
        gitfs.init(function (err) {
            gitfs.commit(givenCommit, function(err) {
                gitfs._getCommitIdFromHEAD(function(err, commitId) {
                    gitfs.show('FrontPage', commitId, function(err, actual) {
                        assert.equal(actual, 'Welcome to n4wiki');
                        done();
                    });
                });
            });
        });
    });

    test('두 개의 파일을 커밋하고 내용을 읽음', function(done) {
        var givenCommit = {
            files: {
                'FrontPage': 'Welcome to n4wiki',
                'Index': 'List of all pages'
            },
            author: {name: 'Yi, EungJun', mail: 'semtlenori@gmail.com', timezone: '+0900'},
            committer: {name: 'Yi, EungJun', mail: 'semtlenori@gmail.com', timezone: '+0900'},
            message: 'initial commit'
        };
        gitfs.init(function (err) {
            gitfs.commit(givenCommit, function(err) {
                gitfs._getCommitIdFromHEAD(function(err, commitId) {
                    gitfs.show('Index', commitId, function(err, actual) {
                        assert.equal(actual, 'List of all pages');
                        done();
                    });
                });
            });
        });
    });

    teardown(function(done) {
        fileutils.rm_rf('pages.git');
        done();
	});
});

suite('gitfs.log', function() {
    var givenCommits;

    setup(function(done){
        var firstCommit = {
            files:{'FrontPage':'Welcome'},
            author:{name:'Yi, EungJun', mail:'semtlenori@gmail.com', timezone:'+0900'},
            committer:{name:'Yi, EungJun', mail:'semtlenori@gmail.com', timezone:'+0900'},
            message:'the first commit'
        }

        var secondCommit = {
            files: {
                'FrontPage':'Welcome to n4wiki',
                'Index':'List of all pages'
            },
            author: {name:'Yi, EungJun', mail:'semtlenori@gmail.com', timezone:'+0900'},
            committer: {name:'Yi, EungJun', mail:'semtlenori@gmail.com', timezone:'+0900'},
            message: 'the second commit'
        }

        givenCommits = [firstCommit, secondCommit];
        gitfs.init(function (err) {
            async.forEachSeries(givenCommits, function(commit, cb) {
                gitfs.commit(commit, cb);
            }, done);
        });
    });

    test('두 번 커밋된 FrontPage 페이지의 히스토리 가져오기', function(done) {
        gitfs.log('FrontPage', function(err, actual) {
            if (err) throw err;
            assert.equal(actual.length, 2);
            assert.equal(actual[0].message, givenCommits[1].message);
            assert.equal(actual[1].message, givenCommits[0].message);
            done();
        });
    });

    test('커밋된 후 삭제된 Index 페이지의 히스토리 가져오기', function(done) {
        gitfs.log('Index', function(err, actual) {
            if (err) throw err;
            assert.equal(actual.length, 1);
            assert.equal(actual[0].message, givenCommits[1].message);
            done();
        });
    });

    test('새로운 사람에 의해 세 번째 커밋이 일어났을 때 히스토리 가져오기', function(done){
        var writer = {name: 'doortts', mail: 'doortts@gmail.com', timezone: '+0900'};
        step(
            function given() {
                var thirdCommit = {
                    files:{
                        'FrontPage':'Welcome to n4wiki',
                        'Index':'List of all pages',
                        'README':'License agreements'
                    },
                    author: writer,
                    committer: writer,
                    message:'Added license message'
                }
                gitfs.commit(thirdCommit, this);
            },
            function when() {
                gitfs.log('README', this);
            },
            function then(err, actual) {
                if (err) throw err;
                assert.equal(actual.length, 1);
                assert.equal(actual[0].author.name, 'doortts');
                done();
            }
        )
    });

    teardown(function() {
        fileutils.rm_rf('pages.git');
	});

});

suite('gitfs.getHeadTree', function(){
    var givenCommits;

    setup(function (done) {
        var firstCommit = {
            files: {'My Diary': 'I have a busy day!'},
            author: {name: 'SW.CHAE', mail: 'doortts@gmail.com', timezone: '+0900'},
            committer: {name: 'SW.CHAE', mail: 'doortts@gmail.com', timezone: '+0900'},
            message: 'diary added'
        }

        givenCommits = [firstCommit];
        gitfs.init(function (err) {
            async.forEachSeries(givenCommits, function (commit, cb) {
                gitfs.commit(commit, cb);
            }, done);
        });
    });
    test('HEAD commit 가져오기',function(done) {
        var writer = {name: 'doortts', mail: 'doortts@gmail.com', timezone: '+0900'};
        var expectedtree = {"My Diary": "f0088144f8ddcebcaef23def5467d45c2adcdb63", "README": "6a1fea92897468a77a436724ae3306891f19b60c"};
        step(
            function given() {
                var commit = {
                    files: {
                        'README': 'License agreements'
                    },
                    author: writer,
                    committer: writer,
                    message: 'Added license message'
                }
                gitfs.commit(commit, this);
            },
            function when(err, commitId){
                gitfs.getHeadTree(this);
            },
            function then(err, tree) {
                assert.deepEqual(tree, expectedtree);
                done();
            }
        )
    });
    teardown(function (done) {
        fileutils.rm_rf('pages.git');
        done();
    });
});

suite('assert.json.equal', function() {
   test('두 json이 서로 일치할 때', function() {
       var expected = {name: "John", email: "john@gamail.com"};
//       var actual = {name: "Jane", email: "jane@gamail.com"};
       var actual = "name";

       assert.json = {};
       assert.json.equal = function(actual, expected) {
           try{
               JSON.stringify(actual);
           } catch(e){
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

