var assert = require('assert');
var gitfs = require('../gitfs');
var async = require('async');
var fs = require('fs');
var step = require('step');
var crypto = require('crypto');
var path = require('path');
var zlib = require('zlib');

//  $ mkdir -p ./pages.git/objects
// 	$ mkdir -p ./pages.git/refs
// 	$ echo 'ref: refs/heads/master' > ./pages.git/HEAD
// 	- 확인: 폴더 정상적으로 생성되었는지 여부

var _ifExistsSync = function(file, func) {
    if (path.existsSync(file)) {
		return func(file);
    }
}

var _mkdir_p = function(_path, func) {
    var base = '';
    var paths_to_create = [];
    if (!path.normalize(_path).split('/').every(function (pathSegment) {
        base = path.join(base, pathSegment);
        if (!path.existsSync(base)) {
            paths_to_create.push(base);
            return true;
        }
        return fs.statSync(base).isDirectory();
    })) {
        return false;
    }

    paths_to_create.forEach(function (pathSegment) { fs.mkdirSync(pathSegment); });
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
				blob=gitfs.createBlobRaw(content);
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
		var blob = gitfs.createBlobRaw(content);
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
				var blob = gitfs.createBlobRaw(content);		
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
	test('bucketPath 에 sha1 해시값에서 앞 두글자를 제외한 38자리 이름의 파일을 deflate로 압축하여 저장', function(done) {
		var blobPath;
		var expectedBlob;
		step(
			function given() {
				var next = this;
				var raw = gitfs.createBlobRaw(content);
			    var digest = gitfs.sha1sum(raw);
				blobPath = 'pages.git/objects/' + digest.substr(0, 2) + '/' + digest.substr(2);
				zlib.deflate(raw, function(err, result) {
					if (err) throw err;
					expectedBlob = result;
					next();
				});

			},
			function when(err) {
				if (err) throw err;
				gitfs.createBlob(content, this);
			},
			function then(err) {
				if (err) throw err;
				var actualBlob = fs.readFileSync(blobPath);
				assert.deepEqual(expectedBlob, actualBlob);
				done();
			}
		);
	});
	teardown(function(done) {
        _rm_rf('pages.git');
        done();
	});	
});

// 		* 이 tree object에 대한 hexdigit sha1 해시값 계산
// 		* tree object를 deflate 알고리즘으로 압축
// 		* pages.git/objects/<sha1 해시값 앞 2자리> 폴더 생성
// 		* 압축된 tree object를 pages.git/objects/<sha1 해시값 앞 2자리>/ 에 sha1 해시값에서 앞 두글자를 제외한 38자리 이름의 파일로 저장

suite('gitfs.createTree', function(){
    var blobs;
    var expectedTreeRaw;

    setup(function (done) {
        _rm_rf('pages.git');

		var digest1 = crypto.createHash('sha1').update('content1').digest('binary')
		var digest2 = crypto.createHash('sha1').update('content2').digest('binary');

		expectedTreeRaw = new Buffer(((7+5+1+20)*2)+5+2+1);
		expectedTreeRaw.write("tree 66\0");
		expectedTreeRaw.write("100644 page1\0", 5 + 2 + 1);
		new Buffer(
		[0x10, 0x5e, 0x7a, 0x84, 0x4a, 0xc8, 0x96, 0xf6, 0x8e, 0x6f, 0x7d, 0xc0, 0xa9, 0x38, 0x9d, 0x3e, 0x9b, 0xe9, 0x5a, 0xbc]).copy(expectedTreeRaw, 21);
		expectedTreeRaw.write("100644 page2\0", 21 + 20);
		new Buffer([0x6d, 0xc9, 0x9d, 0x47, 0x57, 0xbc, 0xb3, 0x5e, 0xaa, 0xf4, 0xcd, 0x3c, 0xb7, 0x90, 0x71, 0x89, 0xfa, 0xb8, 0xd2, 0x54]).copy(expectedTreeRaw, 54);

		blobs = [{name: 'page1', sha1sum: digest1}, {name: 'page2', sha1sum: digest2}];

        done();
    });

	test('생성된 모든 blob object에 대한 참조를 갖는 tree object 생성', function(done) {
		// when & then
		assert.deepEqual(expectedTreeRaw, gitfs.createTreeRaw(blobs));
		done();
	});

    test('생성된 tree object를 git object로 저장', function(done) {
        gitfs.init(function (err) {
            if (err) throw err;
            var digest = crypto.createHash('sha1').update(expectedTreeRaw, 'binary').digest('hex');
            var treePath = path.join('pages.git', 'objects', digest.substr(0, 2), digest.substr(2));
            gitfs.createTree(blobs, function (err) {
                if (err) throw err;
                zlib.inflate(fs.readFileSync(treePath), function(err, result) {
                    if (err) throw err;
                    assert.deepEqual(result, expectedTreeRaw);
                    done();
                });
            });
        });
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
				if (err) {
					assert.equal('HEAD is not exitsts', err.message);
				} else {
				    assert.fail('fail!');
				}
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

// commit object를 생성

// 생성한 tree object 에 대한 참조를 갖는 commit object를 생성

// "commit" <SP> content-length <NUL> tree <SP> sha-1 <NEWLINE> parent <SP> sha-1 <NEWLINE> author <SP> name <SP> "<" mail ">" <SP> unixtime <SP> timezone-offset <NEWLINE> committer <SP> name <SP> "<" mail ">" <SP> unixtime <SP> timezone-offset <NEWLINE> <NEWLINE> log-message

// 단, parent가 없을 경우에는 parent 항목을 생성하지 않는다.
// 이 commit object에 대한 hexdigit sha1 해시값 계산
// commit object를 deflate 알고리즘으로 압축
// pages.git/objects/ 폴더 생성
// 압축된 commit object를 pages.git/objects// 에 sha1 해시값에서 앞 두글자를 제외한 38자리 이름의 파일로 저장

// Sangcheol-ui-MacBook-Pro:heads k16wire$ git cat-file -p c85d65e0f69ed38c1e1dd01d920f8022195c78ad
// tree 635a6d85573c97658e6cd4511067f2e4f3fe48cb
// parent 0cc71c0002496eccbe919c2e5f4c0616f9f2e611
// author Yi, EungJun <semtlenori@gmail.com> 1333091842 +0900
// committer Yi, EungJun <semtlenori@gmail.com> 1333091842 +0900

suite('gitfs.createCommit', function(){
	test('commit object를 읽어오기', function(done) {
		var expectedTreeId;
		step(
			function given(){
			 	expectedTreeId = gitfs.getTree();
			},
			function when(){
				
			},
			function then(err, expectedTreeId){
				var actualTreeId = '1';
				assert.equal(actualTreeId, expectedTreeId);
				done();
			}
		);
	});
});