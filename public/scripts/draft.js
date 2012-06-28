var draft = {}

var _key = function(name) {
  return prefix + '-' + name;
}

var existDraft = function(fields) {
  for (var i in fields) {
    if (localStorage.getItem(_key(fields[i]))) {
      return true;
    }
  }

  return false;
}

var _callbackAfterRestoreDraft = function() {}

var restoreDraft = function(fields) {
  for (var i in fields) {
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
        if (draft.notification) {
          draft.notification.css('display', 'none');
        }
        localStorage.setItem(_key(field), field.getValue());
      });
    } else {
      $(field).keyup(function() {
        if (draft.notification) {
          draft.notification.css('display', 'none');
        }
        localStorage.setItem(_key(field), $(field).val());
      });
    }
  }

  for (var i in fields) {
    _bind(fields[i]);
  }

  $(form).submit(function() {
    for (var i in fields) {
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

  var _init = function() {
    prefix = _prefix;

    // notifaction message
    if (existDraft(fields)) {
      message = i18n.__(
        "<span>Unsaved draft exists.</span>" +
        " Click <a id='restore-draft'>here</a>" +
        "<span> to recover it.</span>");

      draft.notification =
        $('<div id="draft-message"></div>').
        addClass('alert').
        addClass('alert-info').
        append(message).
        insertBefore($(form));

      $('#restore-draft').click(function() {
        restoreDraft(fields);
        $('#draft-message').css("display", "none");
      });
    }

    bindFormAndLocalStorage(form, fields);
  }

  $(function() {
    i18n.onReady(_init);
  });
}
