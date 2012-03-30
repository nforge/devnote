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

suite('gitfs.init', function(){
	setup(function(done) {
        _ifExistsSync('pages.git/objects', fs.rmdirSync);
        _ifExistsSync('pages.git/refs', fs.rmdirSync);
        _ifExistsSync('pages.git/HEAD', fs.unlinkSync);
        _ifExistsSync('pages.git', fs.rmdirSync);
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
	test('이미 폴더가 존재할 경우 안내 메시지 출력', function(){
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
				} else {
				    assert.fail('fail!');
				}
			}
		);	
	});

});

suite('gitfs.createBlob', function() {
	var content;
	setup(function(done) {
		content = 'wiki-content';
		_ifExistsSync('pages.git/objects/f2/c0c508c21b3a49e9f8ffdc82277fb5264fed4f', fs.unlinkSync);
		_ifExistsSync('pages.git/objects/f2', fs.rmdirSync);
        _ifExistsSync('pages.git/objects', fs.rmdirSync);
        _ifExistsSync('pages.git/refs', fs.rmdirSync);
        _ifExistsSync('pages.git/HEAD', fs.unlinkSync);
        _ifExistsSync('pages.git', fs.rmdirSync);

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

	test('blob object를 deflate 알고리즘으로 압축', function(done) {
		var blob;
		var expectedBlob;
		var actualBlob;
		step(
			function given() {
				blob = gitfs.createBlobRaw(content);
				var next = this;
				zlib.deflateRaw(new Buffer(blob, 'ascii'), function(err, result) {
					if (err) throw err;
					expectedBlob = result;
					next();
				});				
			},
			function when(err) {
				var next = this;				
				gitfs.deflate(new Buffer(blob, 'ascii'), function(err, result) {
					if (err) throw err;
					actualBlob = result;
					next();
				});
			},
			function then(err) {
				assert.deepEqual(expectedBlob, actualBlob);
				done();
			}
		);
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
				gitfs.createBlobBucket(digest, this);
			},
			function then(err) {
				if (err) throw err;
				assert.ok(path.existsSync(bucketPath));
				done();
			}
		);
	});
	test('bucketPath 에 sha1 해시값에서 앞 두글자를 제외한 38자리 이름의 파일로 저장', function(done) {
		var blobPath;
		var expectedBlob;
		step(
			function given() {
				var next = this;
				var raw = gitfs.createBlobRaw(content);
			    var digest = gitfs.sha1sum(raw);
				blobPath = 'pages.git/objects/' + digest.substr(0, 2) + '/' + digest.substr(2);
				gitfs.deflate(raw, function(err, result) {
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
		_ifExistsSync('pages.git/objects/f2/c0c508c21b3a49e9f8ffdc82277fb5264fed4f', fs.unlinkSync);
		_ifExistsSync('pages.git/objects/f2', fs.rmdirSync);
        _ifExistsSync('pages.git/objects', fs.rmdirSync);
        _ifExistsSync('pages.git/refs', fs.rmdirSync);
        _ifExistsSync('pages.git/HEAD', fs.unlinkSync);
        _ifExistsSync('pages.git', fs.rmdirSync);
        done();
	});	
});

suite('gitfs.createTree', function(){
	test('생성된 모든 blob object에 대한 참조를 갖는 tree object 생성', function(done) {
		// given		
		var digest1 = crypto.createHash('sha1').update('content1').digest('bin')
		var digest2 = crypto.createHash('sha1').update('content2').digest('bin');

		var blobs = [{name: 'page1', sha1sum: digest1}, {name: 'page2', sha1sum: digest2}];

//ToDo: expected 생성시 Logic을 제거하고 HardCoded DATA로 바꿔야 함
		var content = '';
		blobs.forEach(function(blob) {
			content += '100644 ' + blob.name + '\0' + blob.sha1sum;				
		});
		var expectedTreeRaw = "tree " + content.length + '\0' + content;

		// when & then
		assert.equal(expectedTreeRaw, gitfs.createTreeRaw(blobs));
		done();
	});
});

	// 3. parent의 sha1 id 읽어오기
	// 	* page.git/HEAD를 읽어서 
	// HEAD가 가리키고 있는 참조를 읽어온다.

	// 		예) ref: refs/heads/master

	// 	* 참조가 가리키고 있는 commit id(=sha1)를 읽어온다.
	// 		* 단, parent가 없어서 ref 참조 파일이 없을 경우에는 읽지 않는다.

suite('gitfs.getParentId', function(){
	test('HEAD 파일이 존재하는지 확인', function(done) {
		step(
			function when(){
				gitfs.getParentId(this);
			},
			function then(err) {
				if (err) {
					assert.equal("HEAS is not exitsts", err.message);
				} else {
				    assert.fail('fail!');
				}
				done();
			}
		);	
	});
});

