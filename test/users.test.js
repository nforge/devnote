var assert = require('assert');
var gitfs = require('../lib/users');
var async = require('async');
var step = require('step');
var users = require('../lib/users').users;
var users2 = require('../lib/users').users;
var users3 = require('../lib/users').users;
var util = require('util');

suite("users", function(){
    setup(function () {
        users.removeAll();
    });
    suite("add", function () {
        test("한 명의 새로운 사용자 사용자 추가", function () {
            //Given
            var userA = {
                name: "nekure",
                id: "racoon",
                email: "nekure@gmail.com",
                password: "rrrr"
            }
            //When
            users.add(userA);
            //Then
            assert.equal(users.getTotal(), 1);
            assert.equal(users.findUserById("racoon"), userA);
        });
    });
    suite("remove", function () {
        test("두 명 중 한 명을 삭제 할 경우", function () {
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
            users.add(userA);
            users.add(userB);
            assert.equal(users.getTotal(), 2);

            //When
            users.remove(userB);

            //Then
            assert.equal(users.getTotal(), 1);
            assert.equal(users.findUserById("semtlenori@gmail.com"), undefined);
        });
    });
    suite("changePassword", function(){
        test("자신의 이전 패스워드를 올바르게 입력했을 경우", function(){
            //Given
            var userA = {
                name: "nekure",
                id: "racoon",
                email: "nekure@gmail.com",
                password: "rrrr"
            };
            var findUser = "";

            users.add(userA);

            //When
            users.changePassword('rrrr','gggg', userA);

            //Then
            findUser = users.findUserById(userA.id);
            assert.equal(findUser.id, "racoon");
            assert.equal(findUser.password, "0iDHuWfX4QCc5lu4qTel/iwX3LtkVLcvXJwM6kaP9xZC1oQiBUHGTkRru5no2vJZBSOEQaWgv6eZmCL9NmTZBw=="); //salted password
        });
        test("자신의 이전 패스워드를 잘못 입력했을 경우", function () {
            //Given
            var userA = {
                name: "nekure",
                id: "racoon",
                email: "nekure@gmail.com",
                password: "rrrr"
            };
            var findUser = "";
            users.add(userA);
            
            try{
                //When
                users.changePassword('ffff', 'gggg', userA);    
            } catch (e){
                //Then
                assert.equal(e.message, "Entered previous password is incorrect!");
            }
        });
    })
});


