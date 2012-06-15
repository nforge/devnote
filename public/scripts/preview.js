var preview = {
    last_text: '',
    converter: new Showdown.converter(),
};

preview.update = function() {
    var text, html;

    text = preview.
        getText().
        replace(/```(\w+)((\r|\n|.)*?)(\r|\n)```/gm, function(match, p1, p2) {
            try {
                return '<pre><code class="' + p1 + '">' +
                    hljs(p2, p1).value + '</code></pre>';
            } catch(e) {
                return '<pre><code>' + hljs(p2).value + '</code></pre>';
            }
        });

    if (preview.last_text != text) {
        html = preview.converter.makeHtml(text);
        $("#preview").html(html);
        preview.last_text = text;
    }
};

preview.init = function(editorElement, getText) {
    preview.getText = getText;

    $(function() {
        editorElement.keyup(preview.update);
        preview.update();
    });
};
