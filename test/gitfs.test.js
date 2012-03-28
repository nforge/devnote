var assert = require('assert');
var gitfs = require('../gitfs');
var async = require('async');
var fs = require('fs');
var step = require('step');

//  $ mkdir -p ./pages.git/objects
// 	$ mkdir -p ./pages.git/refs
// 	$ echo 'ref: refs/heads/master' > ./pages.git/HEAD
// 	- 확인: 폴더 정상적으로 생성되었는지 여부

var _ifExistsSync = function(file, func) {
	try{
		fs.statSync(file);
		return func(file);
	}catch (e){
		console.log(e);
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

})
