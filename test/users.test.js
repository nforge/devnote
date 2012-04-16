var assert = require('assert');
var gitfs = require('../lib/users');
var async = require('async');
var step = require('step');

var users = require('../lib/users')


suite("users", function(){
    suite("add", function(){
        test("사용자 추가", function(done){
            //Given
            var userA = {
                name: "nekure",
                nick: "racoon",
                email: "nekure@gmail.com"
            }

            //When
            users.add(userA);

            //Then
            assert.equal(users.getTotal(), 1);
            assert.equal(users.findUserById("nekure@gmail.com"), userA);
            done();
        })
    });

    suite("remove", function(){
        setup(function() {
            users.removeAll();
        })
        test("사용자 삭제", function(){
            //Given
            var userA = {
                name: "nekure",
                nick: "racoon",
                email: "nekure@gmail.com"
            }

            var userB = {
                name: "semtlenori",
                nick: "lori",
                email: "semtlenori@gmail.com"
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
