var _activateLinkKey = function(keyCode, url) {
    $(document.documentElement).keyup(function (event) {
        if (event.which == keyCode) {
            if ($(event.target).is('input') || $(event.target).is('textarea')) {
                return;
            }
            self.location = url;
        }
    });
}

// 'e' for editing page
var activateEditKey = function(url) {
    _activateLinkKey(69, url || '?action=edit');
}

// 'n' for new page
var activateNewKey = function(url) {
    _activateLinkKey(78, url || '/wikis/note/new');
}

// ctrl + enter for submit form
var activateSubmitKey = function() {
    var eventHandler = function (event) {
        if (event.ctrlKey && event.which == 13) {
            $(event.target).parents('form').get(0).submit();
        }
    }

    $('textarea').keydown(eventHandler);
    $('input').keydown(eventHandler);
}
