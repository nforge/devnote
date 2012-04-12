assert = require 'assert'
md = require 'markdown-js'
gfm = require '../gfm'

suite 'Markdown', () ->
    test 'newline', () ->
        source = 'Roses are red\nViolets are blue'
        md.parse gfm.toMarkdown source
