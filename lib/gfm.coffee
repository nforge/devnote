crypto = require 'crypto'

parse = (text) ->
    # Extract pre blocks
    extractions = {}
    text = text.replace /<pre>(\n|.)*?<\/pre>/gm, (match) ->
        md5 = crypto.createHash('md5').update(match).digest('hex')
        extractions[md5] = match
        '{gfm-extraction-' + md5 + '}'

    # prevent foo_bar_baz from ending up with an italic word in the middle
    text = text.replace /(^(?! {4}|\t)\w+_\w+_\w[\w_]*)/gm, (x) ->
        x.replace /_/g, '\\_' if (x.match /_/g).length >= 2

    # in very clear cases, let newlines become <br /> tags
    text = text.replace /^[\w\<][^\n]*\n+/gm, (x) ->
        if x.match /\n{2}/ then x else x.trim() + '  \n'

    # Insert pre block extractions
    text = text.replace /\{gfm-extraction-([0-9a-f]{32})\}/gm, (x, p1) ->
        "\n\n" + extractions[p1]

exports.parse = parse
