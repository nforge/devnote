var libpath = process.env['LIB_COV'] ? '../lib-cov' : '../lib';
var assert = require('assert');
var renderer = require(libpath + '/renderer');

suite('renderer', function() {
  test('사용자는 마크다운 포맷으로 작성된 위키페이지를 렌더링된 HTML 페이지로 볼 수 있다.', function() {
    assert.equal(renderer.markdown('Welcome to **n4wiki**'), '<p>Welcome to <strong>n4wiki</strong></p>');
  });

  test('사용자는 소스코드가 포함된 위키페이지를 구문강조된 HTML 페이지로 볼 수 있다.', function() {
    var actual = renderer.markdown("```python\ndef foo():\n  print 'bar'\n```");
    var expected = '<pre><code class="python">\n<span class="function"><span class="keyword">def</span> <span class="title">foo</span><span class="params">()</span>:</span>\n  <span class="keyword">print</span> <span class="string">\'bar\'</span></code></pre>'
    assert.equal(actual, expected)
  });
});

