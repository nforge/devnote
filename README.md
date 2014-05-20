개발자 노트(Devnote)
====================

[![travis-ci](https://secure.travis-ci.org/nforge/devnote.png?branch=master)](http://travis-ci.org//nforge/devnote)

> 분산형 문서작성 환경: 개발자노트(DEVNOTE)
>
> Distributed simple document writing environment

개발자노트?
========
 SW개발에 있어서 문서(메뉴얼, 노트, 이미지, 리소스 파일 등등)는 매우 중요합니다.
특히 협업 개발이 강조되는 오픈소스 SW개발에서는 SPEC/MANUAL 등을 얼마나 체계적으로 잘 작성하느냐가 프로젝트의 진행에 큰 영향을 미치기도 합니다. 하지만 아이러니하게도 기술이나 제품이 강조되는 것에 비해 이런 부분은 종종 간과되거나 체계적으로 관리되지 않습니다. 

여기에는 근본적인 몇 가지 이유가 있습니다

 - 여러프로젝트에 사용 할 만한 공통적인 개발 문서 표준이 없음
 - 개발자는 MS WORD/HWP등의 복잡한 서식을 요구하는 문서 작성에 익숙하지 않음
 - 단순 문자 저장방식(plain text)의 문서는 서식이 존재하지 않아서 보기가 불편함 (제목, 문단, 강조 등등)
 - 파일 기반 ( .hwp 파일이나 .docx .pptx 등의 파일)은 공동 작업을 수행하거나, 관리 보관이 쉽지 않음
 - 문서는 또한 버전이 관리가 되어야 하는데 파일이름에 기반한 방식(xx-1.0.doc, xx-1.1.doc, xx-1.1.140515.doc와 같은 방식)은 불편하고 유실의 위험이 있습니다.
 - 온라인에 저장(위키나 게시판을 이용)하는 방식은 자료를 이전하거나 분리, 혹은 타인이나 타팀의 자료와 합치기가 어려우며 오프라인 환경에서는 매우 취약함
 - 특히 기존의 위키 방식들은 각각의 위키에 맞는 문법을 배워야 하는 불편함과 비 개발인력(디자이너/기획자)등의 접근어려움이 있습니다.

따라서 익숙한 인터페이스로 쉽게 작성가능하면서도 온라인과 오프라인을 함께 지원하고 인력이나 팀의 분할/병합에 따라 그 때 그 때 컨텐츠 분리와 합침이 자유로운 분산환경 기반 문서 관리 시스템이 꼭 필요합니다. 

그걸 목표로 분산형 문서작성 환경인 개발자노트(DEVNOTE) 프로젝트가 시작되었습니다.
 

실행 화면
---

<img src='https://raw.github.com/nforge/devnote/master/doc/screenshot_devnote.png' width="320">



실행방법
---

[node.js](http://nodejs.org/) 최신버전을 다운로드 받아 설치

쉘에서 아래의 명령을 실행하여 devnote 설치

    git clone https://github.com/nforge/devnote.git
    cd devnote
    npm install --production

쉘에서 아래의 명령을 실행하여 devnote 실행

    npm start --production

개발 참여를 위한 준비
---

C++ 컴파일러 설치

Python 설치

쉘에서 아래 명령을 실행하여 개발 및 테스트에 필요한 npm 모듈 설치

    npm install --production=false

테스트 실행해보기

    npm test

특징
---

1. **Server-side/Front-end 모두 자바스크립트로만 작성되어 있습니다.**
    - 프로젝트 빌드에서 테스트, Template, i18n에 이르기까지 제품코드는 모두 javascript로 만들었습니다.
    - 하단의 설계도 그림을 보시면 좀 더 이해가 빠르실겁니다.
2. **동일한 코드를 Server-side/Front-end 양쪽에서 사용합니다.**
    - 이를테면 markdown 렌더링을 클라이언트에서 하고 있다가, 필요에 따라서는 서버에서 해서 보내거나, 그 반대로 하는 것이 가능합니다.
    - 이를 통해 능동적인 부하분산/클라이언트 환경에 따른 적절한 대응이 가능합니다.
4. **Data Store로 DB를 사용하지 않고 git과 command level에서 호환되는 파일구조로 문서(컨텐츠, 첨부파일 등등)를 저장하도록 만들었습니다.**
    - 따라서 온라인에서만 문서를 작성하는 것이 아니라 git을 사용해서 게시물의 내용을 로컬로 내려받고 수정해서 다시 올리는 것도 가능합니다.
    - 표준 문서 포맷으로 markdown을 사용합니다.
    - 개발자들이 최소한의 구조화된 문서를 작성하는데에 훌륭한 구조입니다. (github 기본 문서포맷 중 하나)
      (하단부의 'GIT compatible storage 실습' 참조)
5. ** 문서를 작성할 때 마크다운 문법 강조기능과 미리보기 기능을 제공합니다.**
    - 새노트 작성시 우측의 접기 버튼을 누르면 preview를 볼 수 있습니다.
6. ** 동시 편집시 충돌을 실시간으로 표시**
    - 동일한 제목의 글을 2명 이상이 동시에 작성하려고 하면 어떤 사용자가 현재 편집을 하려고 하는 중인지를 실시간으로 알려줍니다.
7. **Mobile 지원**
	- 근래에는 당연한 이야기지만 responsive design이 적용되어 있어 모바일에서도 불편없이 사용가능합니다.
    - 모바일에서 어떤 식으로 보이는지 보려면 브라우저의 가로폭을 줄여보세요. :)


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


주의사항
---

- 글의 갯수가 충분히 많이 늘어나면 느려지는 현상이 있습니다. 
- IE 10이상과 크롬/파이어폭스 사용을 권장합니다.


ROAD MAP
---

- UI/UX 개선
- TOC(Table of contents, 목차) 자동 작성 기능
- PDF 등으로 출판(PUBLISHING)기능 지원 
- OPEN API 제공
- 파일 저장 ENGINE 분리
- 속도 개선


Architecture
---
![Devnote Architecture](https://raw.github.com/nforge/devnote/master/doc/devnote_architecture.png)

## License 

The MIT License

Copyright (c) 2012 NAVER & AUTHORS & CONTRIBUTORS

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
