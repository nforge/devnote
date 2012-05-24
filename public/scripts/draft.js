var draft = {}

var _key = function(name) {
    return prefix + '-' + name;
}

var existDraft = function(fields) {
    for(var i in fields) {
        if (localStorage.getItem(_key(fields[i]))) {
            return true;
        }
    }

    return false;
}

var _callbackAfterRestoreDraft = function() {}

var restoreDraft = function(fields) {
    for(var i in fields) {
        var field = fields[i];
        var value = localStorage.getItem(_key(field));
        if (value) {
            if (typeof(field) == 'object' && field.setValue) {
                field.setValue(value);
            } else {
                $(field).val(value);
            }
        }
    }

    _callbackAfterRestoreDraft();
}

var bindFormAndLocalStorage = function(form, fields) {
    var _bind = function(field) {
        if (typeof(field) == 'object' && field.getValue) {
            field.setOption('onKeyEvent', function() {
                localStorage.setItem(_key(field), field.getValue());
            });
        } else {
            $(field).keyup(function() {
                localStorage.setItem(_key(field), $(field).val());
            });
        }
    }

    for(var i in fields) {
        _bind(fields[i]);
    }

    $(form).submit(function() {
        for(var i in fields) {
            localStorage.removeItem(_key(fields[i]));
        }
    });
}

draft.onRestore = function(callback) {
    _callbackAfterRestoreDraft = callback;
}

draft.init = function(_prefix, form, fields) {
    if (typeof(localStorage) != 'object') {
        return false;
    }

    $(document).ready(function init() {
        prefix = _prefix;

        // notifaction message
        if (existDraft(fields)) {
            var restoreLink = 
                $('<a id="restore-draft">Click here</a>')
                .click(function () {
                    restoreDraft(fields);
                    $('#draft-message').css("display", "none");
                });

            draft.notification =
                $('<div id="draft-message"></div>')
                .addClass('alert').addClass('alert-info')
                .append('<span>Unsaved draft exists. </span>')
                .append(restoreLink)
                .append('<span> to recover it.</span>')
                .insertBefore($(form));
        }

        bindFormAndLocalStorage(form, fields);
    });
}
