var assert = require('assert');
var gitfs = require('../lib/users');
var async = require('async');
var step = require('step');
var users = require('../lib/users').users;

suite("users", function(){
    suite("add", function(){
        setup(function() {
            users.removeAll();
        })
        test("사용자 추가", function(){
            //Given
            var userA = {
                name    : "nekure",
                id      : "racoon",
                email   : "nekure@gmail.com",
                password: "rrrr"
            }
            //When
            users.add(userA);
            //Then
            assert.equal(users.getTotal(), 1);
            assert.equal(users.findUserById("racoon"), userA);
        })
        test("사용자 삭제", function(){
            //Given
            var userA = {
                name    : "nekure",
                id      : "racoon",
                email   : "nekure@gmail.com",
                password: "rrrr"
            }

            var userB = {
                name    : "semtlenori",
                id      : "lori",
                email   : "semtlenori@gmail.com",
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
        })
    });
})

