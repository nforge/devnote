
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Express' })
};

exports.addUserForm = function(req, res){
    res.render('user/new', {title: '사용자 등록'})
}