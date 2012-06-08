var fs = require('fs');
var path = require('path');

var storage = null;
var CONFIG_FILENAME = 'config.json';

var _save = function () {
    fs.writeFileSync(CONFIG_FILENAME, JSON.stringify(storage), 'utf-8');
};

var _load = function () {
    storage = JSON.parse(fs.readFileSync(CONFIG_FILENAME), 'utf-8');
};

var _get = function (key) {
    return storage[key];
};

var _set = function (key, value) {
    storage[key] = value;
};

var _init = function () {
    storage = {};
};

var init = function () {
    if (path.existsSync(CONFIG_FILENAME)) {
        _load();
    } else {
        _init();
    }
};

var set = function (key, value) {
    _set(key, value);
    _save();
};

var get = function (key) {
    if (!storage) {
        init();
    }

    return _get(key);
};

exports.set = set;
exports.get = get;
