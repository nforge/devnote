var workingPageList = {};  //작업중인 페이지 목록을 유지한다.

var _createWorkingPageEntry = function(page, user){
    return {
        id: page.id,
        name: page.name,
        user: user,
        startDate: new Date()
    };
};

/**
 * 특정 페이지를 작업중 페이지로 추가한다.
 * @param page { name: ..., id: ...}
 * @param user
 * @param callback (err, 추가성공여부 true/false)
 * @return {*}
 */
exports.update = function(page, user){
    if (page.id == undefined){
        throw new WorkingPageError("page id doesn't exits!");
    }

    if(findByPageName(page.name) == undefined) {
        workingPageList[page.id] = _createWorkingPageEntry(page, user);
        return true;
    }

    if(findByPageName(page.name).id == page.id){
        workingPageList[page.id].name = page.name;
        return true;
    }

    return false;
};

/**
 * 특정 작업중 페이지를 제거한다.
 * @param page의 id
 * @return workingPageList에서 해당 id를 가진 pageEntry 제거 여부
 */
exports.remove = function(id){
    if( workingPageList[id] ){
        delete workingPageList[id];
        return true;
    }
    return false;
}

/**
 * page의 id값을 이용해 작업중인 페이지가 등록되어 있는지 찾는다
 * @param id
 * @return pageEntry = { id: ..., name: .., user: .., startDate: ... }
 */
exports.findByPageId = function(id){
    return workingPageList[id];
}

/**
 * 이름을 이용해 작업중인 페이지가 등록되어 있는지 찾는다
 * @param name
 * @return pageEntry = { id: ..., name: .., user: .., startDate: ... }
 */
var findByPageName = exports.findByPageName = function(name) {
    for(var key in workingPageList){
        if ( workingPageList[key].name === name ){
            return workingPageList[key];
        }
    }
};

/**
 * workingPage entry reset
 */
exports.reset = function(){
    workingPageList = {};
};

/**
 * 모든 작업중인 페이지 가져오기
 * @return {Object}
 */
exports.findAll = function(){
    return workingPageList;
};


/**
 * Working Page Custom Error
 * @param message
 * @constructor
 */
var WorkingPageError = function(message){
    this.name = "WorkingPageError";
    this.message = message || "WorkingPage Error occurred!";
};

WorkingPageError.prototype = new Error();
WorkingPageError.prototype.constructor = WorkingPageError;
