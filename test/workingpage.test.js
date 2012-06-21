var libpath = process.env['LIB_COV'] ? '../lib-cov' : '../lib';
var assert = require('assert');
var step = require('step');
var workingPage = require(libpath +'/workingpage.js');
var HASH = new(require('jshashes').SHA512)();

suite('workingpage', function() {
  var _createUser = function(name, email, id) {
    return {
      name: name,
      email: email,
      id: id
    };
  };
  var _createWorkingPageEntry = function(name, user, id) {
    return {
      id: id,
      name: name,
      user: user,
      startDate: new Date()
    };
  };
  var _createid = function(userid) {
    return new Date().getTime() + +HASH.b64_hmac(userid, 'salt');
  };
  suite('findByPageName', function() {
    setup(function() {
      workingPage.reset();
    });
    test('찾는 페이지가 없을 때', function() {
      //Given
      var userA = _createUser("김포지", "n4wiki@nhn.com", "n4wiki");
      workingPage.update({
        name: "감자탕의 기원",
        id: "123"
      }, userA);

      //When
      var foundPage = workingPage.findByPageName("저녁 노을에 대해서");

      //Then
      assert.deepEqual(foundPage, undefined);
    });
    test('찾는 페이지가 있을 때', function() {
      //Given
      var userA = _createUser("김포지", "n4wiki@nhn.com", "n4wiki");
      workingPage.update({
        name: "감자탕의 기원",
        id: "123"
      }, userA);

      //When
      var foundPage = workingPage.findByPageName("감자탕의 기원");

      //Then
      assert.deepEqual(foundPage.id, "123");
      assert.deepEqual(foundPage.user, userA);
    });
  });
  suite('update', function() {
    setup(function() {
      workingPage.reset();
    });
    test('동일 제목의 페이지가 없을 경우', function() {
      //Given
      var userA = _createUser("김포지", "n4wiki@nhn.com", "n4wiki");
      workingPage.update({
        name: "감자탕의 기원",
        id: "123"
      }, userA);

      //When
      var result = workingPage.update({
        name: "감자탕의 기원에 대해",
        id: "123"
      }, userA);

      //Then
      assert.deepEqual(result, true);
    });
    test('동일 제목의 페이지가 있을 경우', function() {
      //Given
      var userA = _createUser("김포지", "n4wiki@nhn.com", "n4wiki");
      workingPage.update({
        name: "감자탕의 기원",
        id: "123"
      }, userA);

      var userMe = _createUser("너구리", "racoon@nhn.com", "racoon");

      //When
      var result = workingPage.update({
        name: "감자탕의 기원",
        id: "512"
      }, userMe);

      //Then
      assert.deepEqual(result, false);
    });
  });
  suite('remove', function() {
    setup(function() {
      workingPage.reset();
    });
    test('작업이 완료된 경우 작업 페이지를 지운다', function() {
      //Given
      var userA = _createUser("김포지", "n4wiki@nhn.com", "n4wiki");
      var targetPage = {
        name: "감자탕의 기원",
        id: "123"
      };
      workingPage.update(targetPage, userA);

      //When
      var isDeleted = workingPage.remove(targetPage.id);

      //Then
      assert.deepEqual(isDeleted, true);
      assert.deepEqual(workingPage.findByPageId(targetPage.id), undefined);
    });
  });
});
