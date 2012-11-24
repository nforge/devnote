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
var HASH = new(require('jshashes').SHA512)();
var config = require('./config');
var util = require('./util');

var User = function() {
  var users = {};
  var init = function() {
    users = config.get('users') || {};
    for (var key in users) {
      try {
        util.parseTimezone(users[key].timezone);
      } catch (err) {
        users[key].timezone =
          util.convertOffsetToTimezone(new Date().getTimezoneOffset());
      }
    }
  };

  var add = function(user) {
    user.password = _encodePassword(user.password, user.id);
    if (users[user.id]) {
      throw new Error("Already existed id: " + user.id);
    }
    users[user.id] = user;
    save(user);
  };

  var getTotal = function() {
    return Object.keys(users).length;
  };

  var findAll = function() {
    return users;
  };

  var findUserById = function(id) {
    return users[id];
  };

  var remove = function(user) {
    delete users[user.id];
  };

  var removeAll = function() {
    users = {};
  };

  /**
   * 입력받은 패스워드를 암호화 한다.
   * @param pass 입력받은 패스워드 문구
   * @param salt 암호용 소금으로 사용자의 id를 사용한다.
   * @return {*}
   * @private
   */
  var _encodePassword = function(pass, salt) {
    return HASH.b64_hmac(pass, salt);
  };

  var changePassword = function(previousPassword, newPassword, user) {
    var findUser = findUserById(user.id);

    if (findUser === undefined) {
      throw new Error("User does not exits!");
    }
    if (findUser.password !== _encodePassword(previousPassword, user.id)) {
      throw new Error("Entered previous password is incorrect!");
    }
    findUser.password = _encodePassword(newPassword, user.id);
    return save(findUser);
  };

  var save = function(user) {
    if (user === undefined || user.id === undefined) {
      throw new Error("Invalid User Information!");
    }
    users[user.id] = user;

    config.set('users', users);

    return true;
  };

  var login = function(user, callback) {
    var findUser = findUserById(user.id);
    var err;
    if (findUser === undefined) {
      err = new Error("User id or password is not valid!");
      return callback(err, findUser);
    }
    if (findUser.password !== _encodePassword(user.password, user.id)) {
      err = new Error("Password is not valid!");
      return callback(err, null);
    }
    callback(null, findUser);
  };

  init(); // 최초 생성시 관리자 계정 생성등을 수행한다.
  return {
    add: add,
    getTotal: getTotal,
    findAll: findAll,
    findUserById: findUserById,
    removeAll: removeAll,
    remove: remove,
    changePassword: changePassword,
    save: save,
    login: login
  };
};

exports.User = new User();
