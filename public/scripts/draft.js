var _key = function(name) {
    return prefix + '-' + name;
}

var existUnsavedDocument = function(fields) {
    for(var i in fields) {
        if (localStorage.getItem(_key(fields[i]))) {
            return true;
        }
    }

    return false;
}

var restoreUnsavedDocument = function(fields) {
    for(var i in fields) {
        var value = localStorage.getItem(_key(fields[i]));
        if (value) {
            $(fields[i]).val(value);
        }
    }
}

var bindFormAndLocalStorage = function(form, fields) {
    var _bind = function(field) {
        $(field).keyup(function() {
            localStorage.setItem(_key(field), $(field).val());
        });
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

var initDraft = function(_prefix, form, fields) {
    if (typeof(localStorage) != 'object') {
        return false;
    }

    $(document).ready(function init() {
        prefix = _prefix;

        // notifaction message
        if (existUnsavedDocument(fields)) {
            $('<div id="draft-message"></div>')
                .addClass('alert').addClass('alert-info')
                .append('<span>Unsaved draft exists. </span>')
                .append('<a id="restore-draft">Click here</a>')
                .append('<span> to recover it.</span>')
                .insertBefore($(form));

            $('#restore-draft').click(function () {
                restoreUnsavedDocument(fields);
                $('#draft-message').css("display", "none");
            });
        }

        bindFormAndLocalStorage(form, fields);
    });
}
