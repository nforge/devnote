assert = require 'assert'
gfm = (require '../gfm').gfm

suite 'GFMTest', () ->
    test "not touch single underscores inside words", () ->
        assert.equal gfm("foo_bar"), "foo_bar"

    test "not touch underscores in code blocks", () ->
        assert.equal gfm("    foo_bar_baz"), "    foo_bar_baz"

    test "not touch underscores in pre blocks", () ->
        assert.equal gfm("<pre>\nfoo_bar_baz\n</pre>"), "\n\n<pre>\nfoo_bar_baz\n</pre>"

    test "not treat pre blocks with pre-text differently", () ->
        a = "\n\n<pre>\nthis is `a\\_test` and this\\_too\n</pre>"
        b = "hmm<pre>\nthis is `a\\_test` and this\\_too\n</pre>"
        assert.equal gfm(b)[3..-1], gfm(a)[2..-1]

    test "escape two or more underscores inside words", () ->
        assert.equal "foo\\_bar\\_baz", gfm("foo_bar_baz")

    test "turn newlines into br tags in simple cases", () ->
        assert.equal gfm("foo\nbar"), "foo  \nbar"

    test "convert newlines in all groups", () ->
        assert.equal gfm("apple\npear\norange\n\nruby\npython\nerlang"),
            "apple  \npear  \norange\n\nruby  \npython  \nerlang"

    test "convert newlines in even long groups", () ->
        assert.equal gfm("apple\npear\norange\nbanana\n\nruby\npython\nerlang"),
            "apple  \npear  \norange  \nbanana\n\nruby  \npython  \nerlang",

    test "not convert newlines in lists", () ->
        assert.equal gfm("# foo\n# bar"), "# foo\n# bar"
        assert.equal gfm("* foo\n* bar"), "* foo\n* bar"
