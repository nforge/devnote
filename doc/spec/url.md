REST API
---
Method  REST    URI *                             Description
list    GET     /api/:wikiname/pages              전체 위키 페이지 목록
get     GET     /api/:wikiname/pages/:pagename    페이지 읽기
get     GET     /api/:wikiname/ids/:pageid        페이지 읽기 (id로)
insert  POST    /api/:wikiname/pages              페이지 추가
update  PUT     /api/:wikiname/pages/:pagename    페이지 업데이트
delete  DELETE  /api/:wikiname/pages/:pagename    페이지 삭제
patch   PATCH   /api/:wikiname/pages/:pagename    페이지 부분업데이트

list    GET     /api/:wikiname/users              사용자 목록
list    GET     /api/:wikiname/users/new          새 사용자 등록


URI Middle Tag
--------------
pages: 위키 페이지
users: 사용자
ids: 위키 페이지 id


// API: GET /api/{wiki_name}/pages
// id:
wiki.pageLists(id)

VIEW URL
--------
Method  REST    URI(/wikis/:wikiname 의 하위 path임을 가정)             Description
list    GET     /pages                                                  전체 위키 페이지 목록
list    GET     /pages?action=search&keyword=:keyword                   페이지 검색 결과
view    GET     /pages/:pagename                                        페이지 읽기
edit    GET     /pages/:pagename?action=edit                            페이지 편집
diff    GET     /pages/:pagename?action=diff&a=:commitid1&b=:commitid2  페이지 비교
history GET     /pages/:pagename?action=history                         페이지 역사
new     GET     /new                                                    새 페이지
get     GET     /users/:id                                              사용자 정보
list    GET     /users                                                  사용자 목록
newuser GET     /users/new                                              새 사용자
login   GET     /users?action=login                                     사용자 로그인



ToDos <참고>
-----
GET      /todos/            => index
POST     /todos/            => create
GET      /todos/:id         => show
PUT      /todos/:id         => update
DELETE   /todos/:id         => remove
GET      /todos/:id/add     => add
GET      /todos/:id/edit    => edit