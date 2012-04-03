var assert = require('assert');
var gitfs = require('../gitfs');
var async = require('async');
var fs = require('fs');
var step = require('step');
var crypto = require('crypto');
var path = require('path');
var zlib = require('zlib');

//  $ mkdir -p ./pages.git/objects
//     $ mkdir -p ./pages.git/refs
//     $ echo 'ref: refs/heads/master' > ./pages.git/HEAD
//     - 확인: 폴더 정상적으로 생성되었는지 여부


var PATH_SEPERATOR = PATH_SEPERATOR || (process.platform == 'win32' ? '\\' : '/');

var _ifExistsSync = function(file, func) {
    if (path.existsSync(file)) {
        return func(file);
    }
}

var _mkdir_p = function(_path, func) {
    var base = '';
    var paths_to_create = [];
    if (!path.normalize(_path).split(PATH_SEPERATOR).every(function (pathSegment) {
        base = path.join(base, pathSegment);
        if (!path.existsSync(base)) {
            paths_to_create.push(base);
            return true;
        }
        return fs.statSync(base).isDirectory();
    })) {
        return false;
    }


    paths_to_create.forEach(function (pathSegment) { 
        fs.mkdirSync(pathSegment); 
    });
}

var _rm_rf = function(_path, func) {
    if (!path.existsSync(_path)) {
        return;
    }

    if (fs.statSync(_path).isDirectory()) {
        var filenames = fs.readdirSync(_path);
        filenames.forEach(function (filename) {
            _rm_rf(path.join(_path, filename));
        });
        fs.rmdirSync(_path);
    } else {
        fs.unlinkSync(_path);
    }
}

suite('gitfs.init', function(){
    setup(function(done) {
        _rm_rf('pages.git');
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
        _rm_rf('pages.git');
        done();
    });
});

suite('gitfs.createBlob', function() {
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
                blob=gitfs.createBlob(content);
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
        var blob = gitfs.createBlob(content);
        var sha1sum = crypto.createHash('sha1');
        sha1sum.update(blob);
        assert.equal(sha1sum.digest('hex'), gitfs.sha1sum(blob));
        done();
    });

    test('pages.git/objects/<sha1 해시값 앞 2자리> 폴더 생성', function(done) {
        var digest;
        var bucketPath = 'pages.git/objects/f2';
        step(
            function given() {
                var blob = gitfs.createBlob(content);        
                var sha1sum = crypto.createHash('sha1');
                sha1sum.update(blob);
                digest = sha1sum.digest('hex');            
                this();
            },
            function when(err) {
                if (err) throw err;
                gitfs.createObjectBucket(digest, this);
            },
            function then(err) {
                if (err) throw err;
                assert.ok(path.existsSync(bucketPath));
                done();
            }
        );
    });
    teardown(function(done) {
        _rm_rf('pages.git');
        done();
    });    
});

suite('gitfs.storeObject', function() {
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
                var raw = gitfs.createBlob(content);
                var digest = gitfs.sha1sum(raw);
                blobPath = 'pages.git/objects/' + digest.substr(0, 2) + '/' + digest.substr(2);
                this();
            },
            function when(err) {
                if (err) throw err;
                gitfs.storeObject(gitfs.createBlob(content), this);
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
        _rm_rf('pages.git');
        done();
    });    
});

suite('gitfs.createTree', function(){
    var tree;
    var expectedTree;

    setup(function (done) {
        _rm_rf('pages.git');

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
        assert.equal(gitfs.createTree(tree).toString(), expectedTree.toString());
        done();
    });

    teardown(function(done) {
        _rm_rf('pages.git');
        done();
    });    
});

suite('gitfs.getParentId', function(){
    setup(function(done) {
        _mkdir_p('pages.git/refs/heads');
        fs.writeFileSync('pages.git/HEAD','ref: refs/heads/master');
        fs.writeFileSync('pages.git/refs/heads/master','f2c0c508c21b3a49e9f8ffdc82277fb5264fed4f');
        done();
    });
    test('HEAD 파일이 존재하지 않을 때 예외처리', function(done) {
        step(
            function when(){
                _ifExistsSync('pages.git/HEAD', fs.unlinkSync);    
                gitfs.getParentId(this);
            },
            function then(err) {
                assert.equal('HEAD is not exitsts', err.message);
                done();
            }
        );    
    });
    test('HEAD 파일 참조 읽어오기', function(done) {
        step(
            function when() {
                gitfs.getParentId(this);
            },
            function then(err, parentId) {
                assert.equal('f2c0c508c21b3a49e9f8ffdc82277fb5264fed4f', parentId);
                done();
            }
        );
    });
    teardown(function() {
        _rm_rf('pages.git');
    });
});

suite('gitfs.createCommit', function(){
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
        var actualCommit = gitfs.createCommit(commit);                
        assert.equal(actualCommit, expectedCommit);
    });
    test('생성된 commit object를 압축해서 저장', function(done) {
        gitfs.init(function (err) {
            if (err) throw err;
            var digest = crypto.createHash('sha1').update(expectedCommit, 'binary').digest('hex');
            var commitPath = path.join('pages.git', 'objects', digest.substr(0, 2), digest.substr(2));
            gitfs.storeObject(gitfs.createCommit(commit), function (err) {
                if (err) throw err;
                zlib.inflate(fs.readFileSync(commitPath), function(err, result) {
                    if (err) throw err;
                    assert.deepEqual(result, new Buffer(expectedCommit));
                    done();
                });
            });
        });
    });
    teardown(function() {
        _rm_rf('pages.git');
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
    test('Welcome to n4wiki 라는 내용을 갖는 FrontPage 파일을 commit 한다.', function(done){
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
                        assert.equal(blob, givenCommit.files['FrontPage']);
                        done();
                    });
                });
            });
        });
    });
    teardown(function() {
        _rm_rf('pages.git');
	});
});
