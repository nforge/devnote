var libpath = process.env['LIB_COV'] ? '../lib-cov' : '../lib';

var assert = require('assert');
var User = require(libpath + '/users').User;
var util = require('util');

suite("User", function() {
  setup(function() {
    User.removeAll();
  });
  suite("add", function() {
    test("한 명의 새로운 사용자 사용자 추가", function() {
      //Given
      var userA = {
        name: "nekure",
        id: "racoon",
        email: "nekure@gmail.com",
        password: "rrrr"
      }
      //When
      User.add(userA);
      //Then
      assert.equal(User.getTotal(), 1);
      assert.equal(User.findUserById("racoon"), userA);
    });
  });
  suite("remove", function() {
    test("두 명 중 한 명을 삭제 할 경우", function() {
      //Given
      var userA = {
        name: "nekure",
        id: "racoon",
        email: "nekure@gmail.com",
        password: "rrrr"
      };

      var userB = {
        name: "semtlenori",
        id: "lori",
        email: "semtlenori@gmail.com",
        password: "nori"
      }
      User.add(userA);
      User.add(userB);
      assert.equal(User.getTotal(), 2);

      //When
      User.remove(userB);

      //Then
      assert.equal(User.getTotal(), 1);
      assert.equal(User.findUserById("semtlenori@gmail.com"), undefined);
    });
  });
  suite("changePassword", function() {
    test("자신의 이전 패스워드를 올바르게 입력했을 경우", function() {
      //Given
      var userA = {
        name: "nekure",
        id: "racoon",
        email: "nekure@gmail.com",
        password: "rrrr"
      };
      var findUser = "";

      User.add(userA);

      //When
      User.changePassword('rrrr', 'gggg', userA);

      //Then
      findUser = User.findUserById(userA.id);
      assert.equal(findUser.id, "racoon");
      assert.equal(findUser.password, "0iDHuWfX4QCc5lu4qTel/iwX3LtkVLcvXJwM6kaP9xZC1oQiBUHGTkRru5no2vJZBSOEQaWgv6eZmCL9NmTZBw=="); //salted password
    });
    test("자신의 이전 패스워드를 잘못 입력했을 경우", function() {
      //Given
      var userA = {
        name: "nekure",
        id: "racoon",
        email: "nekure@gmail.com",
        password: "rrrr"
      };
      var findUser = "";
      User.add(userA);

      try {
        //When
        User.changePassword('ffff', 'gggg', userA);
      } catch (e) {
        //Then
        assert.equal(e.message, "Entered previous password is incorrect!");
      }
    });
  })
  suite("login", function() {
    var userA;
    setup(function() {
      //Given
      userA = {
        name: "nekure",
        id: "racoon",
        email: "nekure@gmail.com",
        password: "rrrr"
      };
      User.add(userA);
    });
    test("정상 로그인", function() {
      //When
      User.login({
          id: 'racoon',
          password: 'rrrr'
      }, function(err, findUser) {
        //Then
        assert.deepEqual(findUser, userA);
      });
    });
    test("비밀번호 틀림", function() {
      //When
      User.login({
          id: 'racoon',
          password: 'rrrR'
      }, function(err, findUser) {
        //Then
        assert.equal(err.message, "User id or password is not valid!");
      });
    });
    test("아이디 틀림", function() {
      //When
      User.login({
          id: 'racon',
          password: 'rrrr'
      }, function(err, findUser) {
        //Then
        assert.equal(err.message, "User id or password is not valid!");
      });
    });
  });
});

// vim:et:sts=2:sw=2
