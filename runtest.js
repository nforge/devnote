var Mocha = require('mocha');

var mocha = new Mocha;
mocha.reporter('spec').ui('tdd');

mocha.addFile('test/users.test.js');

var runner = mocha.run(function(){
  console.log('finished');
});

runner.on('pass', function(test){
  console.log('... %s passed', test.title);
});

runner.on('fail', function(test){
  console.log('... %s failed', test.title);
});