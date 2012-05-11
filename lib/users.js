
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

var HASH = new (require('jshashes').SHA512)()

var User = function(){
    var users = {};
    var init = function(){
        console.log("initial user added >>> ");
        add({
            name: "채수원",
            email: "dorrtts@gmail.com",
            id: "doortts",
            password: "1234"
            });
        add({
            name: "황상철",
            email: "k16wire@gmail.com",
            id: "k16wire",
            password: "4321"
            })
    }

    var add = function(user){
        var saltedPassword = _encodePassword(user.password, user.id);
        user.password = saltedPassword;
        if ( users[user.id] ) {
            throw new Error("Already existed id: " + user.id);
        }
        users[user.id] = user;
        save(user);
    }

    var getTotal = function(){
        return Object.keys(users).length
    }

    var findAll = function(){
        return users;
    }

    var findUserById = function(id){
        return users[id];
    }
    var remove = function(user){
        delete users[user.id];
    }

    var removeAll = function(){
        users = {};
    }

    /**
     * 입력받은 패스워드를 암호화 한다.
     * @param pass 입력받은 패스워드 문구
     * @param salt 암호용 소금으로 사용자의 id를 사용한다.
     * @return {*}
     * @private
     */
    var _encodePassword = function ( pass, salt ){
        if( typeof pass === 'string' && pass.length < 4 ) {
            throw new Error("Too short password!");
        }
        return HASH.b64_hmac(pass, salt )
    }

    var changePassword = function(previousPassword, newPassword, user) {
        var findUser = findUserById(user.id);

        if (findUser === undefined ) {
            throw new Error("User does not exits!");
        }
        if (findUser.password !== _encodePassword(previousPassword, user.id)){
            throw new Error("Entered previous password is incorrect!");
        }
        findUser.password = _encodePassword(newPassword, user.id);
        return save(findUser);
    }

    var save = function(user) {
        if ( user === undefined || user.id === undefined){
            throw new Error("Invalid User Information!");
        }
        users[user.id] = user;
        // ToDo: DataStore에 영구저장 하는 경우 save를 구현해야 함
        return true;
    }

    var login = function(user, callback) {
        var findUser = findUserById(user.id);
        var err;

        if (findUser === undefined ) {
            err = new Error("User id or password is not valid!");
        }
        if (findUser.password !== _encodePassword(user.password, user.id)) {
            err = new Error("User id or password is not valid!");
        }
        callback(err, findUser);
    }

    init(); // 최초 생성시 관리자 계정 생성등을 수행한다.
    return {
        add            : add,
        getTotal       : getTotal,
        findAll        : findAll,
        findUserById   : findUserById,
        removeAll      : removeAll,
        remove         : remove,
        changePassword : changePassword,
        save           : save,
        login          : login
    }
}

exports.User = new User();