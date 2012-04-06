REST API
---
Method  REST    URI *                                       Description
list    GET     /api/{wiki_name}/pages                    <= 전체 위키 페이지 목록 
get     GET     /api/{wiki_name}/pages/{wikipage_name}    <= 페이지 읽기
get     GET     /api/{wiki_name}/ids/{wikipage_id}        <= 페이지 읽기 (id로)
insert  POST    /api/{wiki_name}/pages                    <= 페이지 추가
update  PUT     /api/{wiki_name}/pages/{wikipage_name}    <= 페이지 업데이트
delete  DELETE  /api/{wiki_name}/pages/{wikipage_name}    <= 페이지 삭제
patch   PATCH   /api/{wiki_name}/pages/{wikipage_name}    <= 페이지 부분업데이트


// API: GET /api/{wiki_name}/pages
// id: 
wiki.pageLists(id)
