
    var last_text = '';
    var converter = new Showdown.converter();
    var preview = function() {
        var text = $("#body").val();

        text = text.replace(/```(\w+)((\r|\n|.)*?)(\r|\n)```/gm, function(match, p1, p2) {
            try {
                return '<pre><code class="' + p1 + '">' + hljs(p2, p1).value + '</code></pre>';
            } catch(e) {
                return '<pre><code>' + hljs(p2).value + '</code></pre>';
            }
        });

        if (last_text != text) {
            var html = converter.makeHtml(text);
            $("#preview").html(html);
            last_text = text;
        }
    }

    window.addEventListener('load', function init() {
        $("#body").keyup(function(){
            _.throttle(preview, 1000) ;
            preview();
        });
        preview();
    });
