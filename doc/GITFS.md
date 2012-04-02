GITFS
 * 위키 생성 (1)
 	$ mkdir -p ./pages.git/objects
	$ mkdir -p ./pages.git/refs
	$ echo 'ref: refs/heads/master' > ./pages.git/HEAD

	- 확인: 폴더 정상적으로 생성되었는지 여부

 * 위키 페이지 작성 (3)
	1. blob object 생성
		* blob object 객체 생성
			* `"blob" <SP> content-length <NUL> wikipage-content`
		* 이 blob object에 대한 hexdigit sha1 해시값 계산
		* blob object를 deflate 알고리즘으로 압축
		* pages.git/objects/<sha1 해시값 앞 2자리> 폴더 생성
		* 압축된 blob object를 pages.git/objects/<sha1 해시값 앞 2자리>/ 에 sha1 해시값에서 앞 두글자를 제외한 38자리 이름의 파일로 저장
	2. tree object 생성
		* 생성된 모든 blob object에 대한 참조를 갖는 tree object 생성

			`"tree" <SP> content-length <NUL> 1*("100644" <SP> wikipage-name <NUL> sha-1)`

		* 이 tree object에 대한 hexdigit sha1 해시값 계산
		* tree object를 deflate 알고리즘으로 압축
		* pages.git/objects/<sha1 해시값 앞 2자리> 폴더 생성
		* 압축된 tree object를 pages.git/objects/<sha1 해시값 앞 2자리>/ 에 sha1 해시값에서 앞 두글자를 제외한 38자리 이름의 파일로 저장

	3. parent의 sha1 id 읽어오기
		* page.git/HEAD를 읽어서 HEAD가 가리키고 있는 참조를 읽어온다.

			예) ref: refs/heads/master

		* 참조가 가리키고 있는 commit id(=sha1)를 읽어온다.
			* 단, parent가 없어서 ref 참조 파일이 없을 경우에는 읽지 않는다.

	4. commit object를 생성
		* 생성한 tree object 에 대한 참조를 갖는 commit object를 생성 

			`"commit" <SP> content-length <NUL>
			tree <SP> sha-1 <NEWLINE>
			parent <SP> sha-1 <NEWLINE>
			author <SP> name <SP> "<" mail ">" <SP> unixtime <SP> timezone-offset <NEWLINE>
			committer <SP> name <SP> "<" mail ">" <SP> unixtime <SP> timezone-offset <NEWLINE>
			<NEWLINE>
			log-message`

			* 단, parent가 없을 경우에는 parent 항목을 생성하지 않는다.

		* 이 commit object에 대한 hexdigit sha1 해시값 계산
		* commit object를 deflate 알고리즘으로 압축
		* pages.git/objects/<sha1 해시값 앞 2자리> 폴더 생성
		* 압축된 commit object를 pages.git/objects/<sha1 해시값 앞 2자리>/ 에 sha1 해시값에서 앞 두글자를 제외한 38자리 이름의 파일로 저장

	5. .git/refs/heads/master 를 생성한 commit object 의 id 로 갱신

 * 위키 페이지 삭제 (1)
 	1. .git/HEAD를 읽어들인다.

 		예) ref: refs/heads/master
 	
 	2. 위 참조가 가리키는 sha1값의 commit을 찾는다.
 	3. commit에서 tree의 sha1값을 이용해 해당 페이지가 포함되어 있는 tree를 찾는다.
 	4. 찾은 tree에서 삭제할 페이지를 제외한 새 tree object 생성
	5. tree object를 갖는 commit object 생성
		- 위키페이지 작성의 tree object 생성 과정 참조
	6. .git/refs/heads/master 를 생성한 commit object 의 id 로 갱신

 * 기존 위키 페이지 편집 후 저장(0)
 	* '위키 페이지 작성'과 완전동일
 		*단, 동일한 wikipage-name이 tree에 존재하면 id만 교체

 * 위키 페이지 열람 (1)
 	1. .git/HEAD를 읽어들인다.

 		예) ref: refs/heads/master
 	
 	2. 위 참조가 가리키는 sha1값의 commit을 찾는다.
 	3. commit에서 tree의 sha1값을 이용해 해당 페이지가 포함되어 있는 tree를 찾는다.
 	4. 열람하고자 하는 페이지와 이름이 같은 blob의 id를 찾음
 	5. 해당 blob을 inflate한다.
 	6. blob 헤더를 제거하고 나머지 내용(wikipage-content)을 리턴한다.

 * 위키 페이지 역사 출력 (2)
 	1. .git/HEAD를 읽어들인다.

 		예) ref: refs/heads/master
 	
 	2. 위 참조가 가리키는 sha1값의 commit을 찾는다.
 	3. commit에서 tree의 sha1값을 이용해 해당 페이지가 포함되어 있는 tree를 찾는다.
	4. 해당 페이지가 포함되어 있는 tree가 존재한다면 commit의 내용을 임시공간에 저장
		- 임시공간에 저장할 내용: inflate되고 blob 헤더가 제거된 commit object
	5. parent (commit)을 찾아서 3단계로 돌아감.
	6. commmit의 parent가 존재하지 않으면 중단
	7. 임시공간에 저장한 내용을 반환
		- 임시공간에 저장한 내용은 찾은 commit object 들

 * 위키 페이지를 특정 시점(commit)으로 되돌리기 (1)
 	1. 변경하고자 하는 위키페이지의 이름과 그 페이지의 변경하고자 하는 시점의 id를 입력받는다.
	2. .git/HEAD를 읽어들인다.

 		예) ref: refs/heads/master
 	
 	3. 위 참조가 가리키는 sha1값의 commit을 찾는다.
 	4. commit에서 되돌리고자 하는 위키페이지가 포함되어 있는 tree를 찾는다.
 	5. tree에서 그 페이지의 id를 입력받은 id로 대체한 새 tree를 생성한다.
    6. 이 tree를 갖는 commit object 생성
	7. .git/refs/heads/master 를 생성한 commit object 의 id 로 갱신

