
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
    function init(){
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

    /**
     * 입력받은 패스워드를 암호화 한다.
     * @param pass 입력받은 패스워드 문구
     * @param salt 암호용 소금으로 사용자의 id를 사용한다.
     * @return {*}
     * @private
     */
    function _encodePassword( pass, salt ){
        if( typeof pass === 'string' && pass.length < 4 ) {
            throw new Error("Too short password!");
        }
        return HASH.b64_hmac(pass, salt )
    }

    function changePassword(previousPassword, newPassword, user) {
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

    function save(user) {
        // ToDo: DataStore에 영구저장 하는 경우 save를 구현해야 함
        return true;
    }

    init(); // 최초 생성시 관리자 계정 생성등을 수행한다.
    return {
        add         : add, 
        getTotal    : getTotal,
        findAll     : findAll,
        findUserById: findUserById,
        removeAll   : removeAll,
        remove      : remove,
        changePassword: changePassword,
        save        : save
    }
}

exports.users = new Users();