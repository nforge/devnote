assert = require 'assert'
md = require 'markdown-js'
gfm = require '../gfm'

suite 'Markdown', () ->
    test 'newline', () ->
        source = 'node\npython\nruby'
        assert.equal (md.parse source), '<p>node\npython\nruby</p>'

        source = 'node\npython\nruby'
        assert.equal (gfm.toMarkdown source), 'node  \npython  \nruby'
        assert.equal (md.parse gfm.toMarkdown source), '<p>node <br />\npython <br />\nruby</p>'

        source = 'node\n\npython\nruby'
        assert.equal (gfm.toMarkdown source), 'node\n\npython  \nruby'
        assert.equal (md.parse gfm.toMarkdown source), '<p>node</p>\n\n<p>python <br />\nruby</p>'
