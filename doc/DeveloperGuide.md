n4gwiki Developer Style Guide
===

Coding Convention
---
 - Felix's Node.js Style을 따릅니다.
     - http://nodeguide.atelier.weaveus.com/style.html
     - [단, 클로저 중첩Nested하기](http://nodeguide.atelier.weaveus.com/style.html#클로저-중첩nested하기)는 우선 예외로 하고 작성자가 가독성을 고려해 편한데로 작성
 - callback 함수의 첫 번째 argument는 err
 - callback을 arguement로 넘여야 한다면, 맨 마지막에 표시

    ```
    listen.on('event', function(err, data, callback)){ ...
    ```

 - private method는 "_"로 시작

    ```
    var _go = function(){...}
    ```

 - CoffeeScript의 경우 아래 Style을 따릅니다.
    - https://github.com/polarmobile/coffeescript-style-guide
 - js file로 클래스를 구분

    ```
    예) GitFS Class는 => project_home/lib/gitfs.js
    ```

Achitechture
---
 - Foundation
    - Language: Javascript with [underscore.js](http://documentcloud.github.com/underscore/)
    - Platform: [node.js](http://nodejs.org)
    - Web Framework: [express](http://expressjs.com/), ([한글](http://firejune.io/express/))
    - Template Engine: [jade](http://jade-lang.com/)
    - UI toolkit: [Bootstrap](http://twitter.github.com/bootstrap/)
    - Logging: [winston](https://github.com/flatiron/winston)
        - 커스텀 로거를 만들어야 하나?
        - 로깅은 어디에 남기나? 파일?
        - 예외에 대한 로깅은 따로?
    - Callback Indentation처리: [step](https://github.com/creationix/step)
    - 추가 고려 대상
        - Step 대체: [Async.js](https://github.com/caolan/async)
        - Transcompile language for javascript: [CoffeeScript](http://coffeescript.org/)
        - CSS Language: [less](lesscss.org)
        - MVVM Framework: [ember.js](http://emberjs.com)
 - Modeling
    - TBD

Documentation & Comments
---
 - Api Doc Generation: [JSDOC](http://www.2ality.com/2011/08/jsdoc-intro.html)
 - Comments Sample: https://github.com/visionmedia/mocha/blob/master/lib/mocha.js
 - 기타 가이드 문서는 Markdown Plain Text로 작성이 기본
    - 추후 n4wiki에서 기능 지원시 Markdown Extra 사용 (http://michelf.com/projects/php-markdown/extra/)

Test
---
 - Write and Run
    - write: ./test 디렉터리에 작성
    - run: mocha -u tdd -R spec
 - BASE: [Mocha](http://visionmedia.github.com/mocha/)
 - Utils
    - BDD Style Support: [should.js](https://github.com/visionmedia/should.js)
    - Brower Test: [Zombie.js](http://zombie.labnotes.org/)
 - CI Server
    - Travis CI (if we can use...)
      - Sameple Project: http://travis-ci.org/doortts/node-test-samples
 - Test Server
    - IP: 10.64.80.79

Development Environment
---
 - [Editor: Sublime Text2](http://www.sublimetext.com/2)(추천), vim, etc.. :)
 - Debugging: Google Chrome + [node-inspector](https://github.com/dannycoates/node-inspector)
 - Source Code Encoding Type: UTF8
 - Folder 구성
    - express에서 생성한 폴더 기본
    - 추가 폴더 (n4wiki가 project_home일 때)

        ```
        n4wiki
            ./doc
            ./lib       <- 직접 작성한 라이브러리
            ./lib_ext   <- 직접 가져온 외부 모듈
            ./node_module
            ./test
        ```
