개발자 노트(Devnote)
====================

![travis-ci](https://secure.travis-ci.org/nforge/devnote.png?branch=master)

실행방법
========

아래 사이트에서 node.js 최신버전을 다운로드 받아 설치

    http://nodejs.org/

쉘에서 아래의 명령을 실행하여 devnote 설치

    git clone https://github.com/nforge/devnote.git
    cd devnote
    npm install --production

쉘에서 아래의 명령을 실행하여 devnote 실행

    npm start --production

개발 참여를 위한 준비
=====================

C++ 컴파일러 설치

Python 설치

쉘에서 아래 명령을 실행하여 개발 및 테스트에 필요한 npm 모듈 설치

    npm install --production=false

테스트 실행해보기

    npm test

특징
====

1. **Server-side/Front-end 모두 자바스크립트로만 작성되어 있습니다.**
    - 프로젝트 빌드에서 테스트, Template, i18n에 이르기까지 제품코드는 모두 javascript로 만들었습니다.
    - 하단의 설계도 그림을 보시면 좀 더 이해가 빠르실겁니다.
2. **동일한 코드를 Server-side/Front-end 양쪽에서 사용합니다.**
    - 이를테면 markdown 렌더링을 클라이언트에서 하고 있다가, 필요에 따라서는 서버에서 해서 보내거나, 그 반대로 하는 것이 가능합니다.
    - 이를 통해 능동적인 부하분산/클라이언트 환경에 따른 적절한 대응이 가능합니다.
4. **Data Store로 DB를 사용하지 않고 git과 command level에서 호환되는 파일구조로 contents를 저장하도록 만들었습니다.**
    - 따라서 마치 git을 사용하듯 git clone, push, pull 을 사용해서 게시물의 내용을 로컬로 내려받고 수정해서 다시 올리는 것이 가능합니다.
    - 표준 문서 포맷은 앞서 이야기 드렸듯이 markdown 입니다.
    - 개발자들이 최소한의 구조화된 문서를 작성하는데 있어 markdown은 매우 훌륭한 구조라 생각합니다. (github 기본 문서포맷 중 하나죠)
    - 문서 내려받아 수정해서 올리는 작업이 기본 git 방식으로 동작합니다. (하단부의 'GIT compatible storage 실습' 참조)
5. **노트 작성할 때 markdown syntax highlight와 미리보기 기능을 제공합니다.**
    - 새노트 작성시 우측의 접기 버튼을 누르면 preview를 볼 수 있습니다.
6. **페이지 제목 충돌 실시간 표시**
    - 동일한 제목의 글을 2명 이상이 동시에 작성하려고 하면 충돌여부를 실시간으로 알려줍니다.
7. **Mobile 지원**
	- 근래에는 당연한 이야기지만 responsive design이 적용되어 있어 모바일에서도 불편없이 사용가능합니다.
    - 모바일에서 어떤 식으로 보이는지 보려면 브라우저의 가로폭을 줄여보세요. :)
8. **오픈소스 프로젝트라 전체 코드가 공개될 예정입니다.**
    - 기본 뼈대 마무리 하는 대로 외부 오픈해서 내부/외부 개발자들과 함께 만들어 가려고 합니다.
    - 이달 말/다음달 초를 예상하고 있습니다.


GIT compatible storage 실습 
----

아래 URL로 접속해 사용자를 추가합니다.

    http://서버ip:3000/wikis/note/users/new

웹 페이지에 접근해서 새 노트(MyPage) 작성합니다.
git clone으로 노트를 내려 받습니다.

    git clone devnote@서버ip:{notes/note.git의 경로}

note 폴더내의 방금 작성한 노트제목의 파일을 열어서 내용 수정
수정된 페이지를 서버로 다시 올립니다.

    git add MyPage

    git commit -m "push test"

    git push

웹 페이지로 접근해서 해당 내용 수정여부 확인합니다.


알려진 문제점
---

- 글의 갯수가 충분히 많이 늘어나면 느려지는 현상이 있습니다.
- UI는 도움 받아서 하고 있는데 저희가 서버 개발자들이다 보니 관련 센스가 다소 부족합니다.
- IE지원을 충분히 고려하지 않았습니다.(크롬/파이어폭스 사용을 권장합니다)
- 등등..


가능성과 의의
-----

- **node.js & server-side javascript 에 대한 기술**
    - 이 분야는 앞으로 특수 기술이라기 보다는 일반 기술로의 범용화를 목표로 하고 있습니다.
    - 선행 삽질 비용을 저희가 먼저 치뤘기 때문에 기술이 필요해 질 때 도입 비용을 줄일 수 있습니다. (기술 레퍼런스 프로젝트가 될 수 있게 만들예정입니다)
- **개발자 노트**
    - 파일 저장 웹 서비스, code syntax highlight, 실시간 편집,  git clone, push 지원... 어디서 많이 보던 내용 아닌가요? : ) 경우에 따라, 더 발전 시킨다면 github 같은 서비스를 만드는 것도 가능합니다.
    - 메뉴얼, wiki, 공동 저작이 필요한 어디든 사용 할 수 있도록 만드는 것이 목표입니다.
- **nFORGE 연동**
    - 저희 팀 미션 중 하나가 nFORGE 개발인데요 nFORGE 위키를 개발자 노트로 대체(혹은 포함)할 예정입니다. 

ToDo List
---
- 코드 공개 준비
    - 문서화, 리팩터링
- 서비스 버그 및 불편 사항들 해결
- 외부 개발자 참여 정책수립 

Architecture
---
![Devnote Architecture](https://raw.github.com/nforge/devnote/master/doc/devnote_architecture.png)

## License 

(The MIT License)

Copyright (c) 2012 nFORGE &lt;nforge@nhn.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
