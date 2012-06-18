/*
Require hljs only if this script is loaded on node.js.
*/
if (typeof require == 'function') {
  var hljs = require('hljs');
}

/*
Add C families support in highlight.js.
*/

var hljs_build_language_c90 = function() {
  var C90_KEYWORDS = {
    'keyword': {
      'auto': 1,
      'break': 1,
      'case': 1,
      'char': 1,
      'const': 1,
      'continue': 1,
      'default': 1,
      'do': 1,
      'double': 1,
      'else': 1,
      'enum': 1,
      'extern': 1,
      'float': 1,
      'for': 1,
      'goto': 1,
      'if': 1,
      'int': 1,
      'long': 1,
      'register': 1,
      'return': 1,
      'short': 1,
      'signed': 1,
      'sizeof': 1,
      'static': 1,
      'struct': 1,
      'switch': 1,
      'typedef': 1,
      'union': 1,
      'unsigned': 1,
      'void': 1,
      'volatile': 1,
      'while': 1,
    },
  };
  return {
    defaultMode: {
      keywords: C90_KEYWORDS,
      illegal: '</',
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.QUOTE_STRING_MODE,
      {
        className: 'string',
        begin: '\'',
        end: '[^\\\\]\'',
        illegal: '[^\\\\][^\']'
      },
        hljs.C_NUMBER_MODE,
      {
        className: 'preprocessor',
        begin: '#',
        end: '$'
      },
        ]
    }
  };
};

/*
Language: C90
*/

hljs.LANGUAGES.c90 = hljs_build_language_c90();

/*
Language: C99
*/

hljs.LANGUAGES.c99 = function() {
  c99 = hljs_build_language_c90();

  var c99_keywords = {
    '_Bool': 1,
    '_Complex': 1,
    '_Imaginary': 1,
    'inline': 1,
    'restrict': 1,
  }

  for (var keyword in c99_keywords) {
    c99.defaultMode.keywords.keyword[keyword] = c99_keywords[keyword];
  }

  return c99;

}();

/*
Language: C11
*/

hljs.LANGUAGES.c11 = function() {
  c11 = hljs_build_language_c90();

  var c11_keywords = {
    '_Bool': 1,
    '_Complex': 1,
    '_Imaginary': 1,
    'inline': 1,
    'restrict': 1,
    '_Alignas': 1,
    '_Alignof': 1,
    '_Atomic': 1,
    '_Noreturn': 1,
    '_Thread_local': 1,
    'alignas': 1,
    'alignof': 1,
    'noreturn': 1,
    'static_assert': 1,
    'thread_local': 1,
  }

  for (var keyword in c11_keywords) {
    c11.defaultMode.keywords.keyword[keyword] = c11_keywords[keyword];
  }

  return c11;
}();

/*
Language: C
*/

hljs.LANGUAGES.c = hljs.LANGUAGES.c99;
