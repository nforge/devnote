var activateEditKey = function() {
    $(document.documentElement).keyup(function (event) {
        if (event.which == 69) {
            if ($(event.target).is('input') || $(event.target).is('textarea')) {
                return;
            }
            self.location = '?action=edit';
        }
    });
}

var activateSubmitKey = function() {
    var eventHandler = function (event) {
        if (event.ctrlKey && event.which == 13) {
            $(event.target).parents('form').get(0).submit();
        }
    }

    $('textarea').keydown(eventHandler);
    $('input').keydown(eventHandler);
}
