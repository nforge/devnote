var hljs = require('hljs');
require('../public/scripts/highlight-c.js');
var ghm = require('github-flavored-markdown');
var _ = require('underscore');

var markdown = function(content) {
  // Syntax highlight
  var pattern = /```(\w+)((\r|\n|.)*?)(\r|\n)```/gm;
  content = content.replace(pattern, function(match, p1, p2) {
    var startTag, highlighted, endTag;

    try {
      highlighted = hljs(p2, p1).value;
      startTag = '<pre><code class="' + p1 + '">';
    } catch (e) {
      highlighted = hljs(p2).value;
      startTag = '<pre><code>';
    }

    endTag = '</code></pre>';

    return startTag + highlighted + endTag;
  });

  // markdown rendering
  return ghm.parse(content);
};

var diff = function(diff, inlineCss) {
  var result = '';

  diff.forEach(function(seg) {
    var attr = '';
    if (inlineCss) {
      if (seg.added) {
        attr = "style = 'background-color: #DFD;'";
      } else if (seg.removed) {
        attr = "style = 'background-color: #FDD:'";
      }
    } else {
      if (seg.added) {
        attr = "class = 'added'";
      } else if (seg.removed) {
        attr = "class = 'removed'";
      }
    }
    result = _.reduce(
    seg.value.split('\n'), function(a, b) {
      return a + '<p ' + attr + '>' + b + '</p>';
    }, result);
  });

  return result;
};

var _renderFoundItem = function(matched) {
  var LIMIT = 120;
  var rendered = '';
  var keyword, input, index, begin, end;

  if (matched instanceof Array) {
    keyword = matched[0];
    input = matched.input;
    index = matched.index;
    begin = Math.max(0, index - Math.floor((LIMIT - keyword.length) / 2));
    end = Math.max(begin + LIMIT, begin + keyword.length);

    if (begin > 0) {
      rendered += '...';
    }

    rendered +=
      input.substr(begin, index - begin) + '<mark>' + keyword + '</mark>' +
      input.substr(index + keyword.length, end - (index + keyword.length));

    if (end < input.length) {
      rendered += '...';
    }
  } else {
    if (LIMIT < matched.length) {
      rendered = matched.substr(0, LIMIT) + '...';
    } else {
      rendered = matched;
    }
  }

  return rendered;
}

/**
 * wiki.search 의 검색결과를 HTML로 렌더링한다.
 * @param {Array} searched An array of the result of string.match. wiki.search 의 결과값
 * @return {Object} result {
 *     <pagename>: {
 *         title: <html>,
 *         body: <html>
 *     },
 *     ...,
 * }
 */
var search = function(searched, keyword) {
  var result = {};

  Object.keys(searched).map(function(key) {
    var index = key.search(keyword);
    if (index >= 0) {
      renderedTitle =
        key.substr(0, index) + '<mark>' + key.substr(index, keyword.length) +
        '</mark>' + key.substr(index + keyword.length);
    } else {
      renderedTitle = key;
    }
    result[key] = {
      title: renderedTitle,
      body: _renderFoundItem(searched[key])
    };
  });

  return result;
};

exports.markdown = markdown;
exports.search = search;
exports.diff = diff;
