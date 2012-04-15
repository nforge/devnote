
// user = {
//     name: "nekure",
//     email: "nekure@racooncity.com" 
// }

// users = []

var Users = function(){
    var users = [];

    var add = function(user){
        users.push(user);
    }

    var getTotal = function(){
        return users.length
    }

    var findUsers = function(){
        return users;
    }

    var findUserById = function(id){
        for (var idx in users){
            if( users[idx].email == id ){
                return users[idx];
            }
        }
    }
    var remove = function(user){
        for (var idx in users){
            if( users[idx].email == user.email ){
                users.splice(idx,1);
            }
        }
    }
    var removeAll = function(){
        users = [];
    }
    return { 
        add         : add, 
        getTotal    : getTotal,
        findUsers   : findUsers,
        findUserById: findUserById,
        removeAll   : removeAll,
        remove      : remove
    }
}

var users = new Users();

exports.removeAll    = users.removeAll;
exports.remove       = users.remove;
exports.add          = users.add;
exports.getTotal     = users.getTotal;
exports.findUsers    = users.findUsers;
exports.findUserById = users.findUserById;

