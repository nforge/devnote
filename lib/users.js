
// user = {
//     id: "doortts"
//     name: "nekure",
//     email: "nekure@racooncity.com" 
//     passwd: "1234"
// }

// users = {
//     doortts : {
//         id: "doortts"
//         name: "nekure",
//         email: "nekure@racooncity.com"
//         passwd: "1234"
//     },
//     ...
// }

HASH = new (require('jshashes').SHA512)()

var Users = function(){
    var users = {};
    function add(user){
        // ToDo: 중복검사
        // ToDo: Password 유효성 검사
        var saltedPassword = _encodePassword(user.password, user.id);
        user.password = saltedPassword;
        if ( users[user.id] ) {
            throw new Error("Already existed id: " + user.id);
        }
        users[user.id] = user;
    }

    function getTotal(){
        return Object.keys(users).length
    }

    function findAll(){
        return users;
    }

    function findUserById(id){
        return users[id];
    }
    function remove(user){
        delete users[user.id];
    }
    function removeAll(){
        users = {};
    }

    function _encodePassword( pass, salt ){
        if( typeof pass === 'string' && pass.length < 4 ) {
            throw new Error("Too short password!");
        }
        
        return HASH.b64_hmac(pass, salt )
    }

    return {
        add         : add, 
        getTotal    : getTotal,
        findAll     : findAll,
        findUserById: findUserById,
        removeAll   : removeAll,
        remove      : remove
    }
}

var users = new Users();
var _initialUser = {
    name: "채수원",
    email: "dorrtts@gmail.com",
    id: "doortts",
    password: "1234"
}


users.add(_initialUser);
console.log("initial user added >>> ");
console.log(_initialUser);

exports.users = users;
