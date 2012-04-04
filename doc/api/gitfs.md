# Git Filesystem

Git과 호환되는 기반의 파일 시스템.

### init(callback)

Git 저장소를 생성한다.

### commit(commit, callback)

Git 저장소에 커밋한다. `commit` 은 다음의 프로퍼티를 갖는다.

* files: 커밋될 모든 파일. 파일명을 프로퍼티 이름으로, 파일 내용을 프로퍼티 값으로 하는 오브젝트이다. 새로 커밋되거나 변경된 파일이 아니라, 이 커밋의 시점에서 저장소에 존재해야 하는 모든 파일임에 주의한다.
* author, committer: 저자 혹은 커미터 정보. 각각 name, mail, timezone 프로퍼티를 갖는다.
    * name: 이름
    * mail: 메일 주소
    * timezone: 표준시간대. 예) `+0900`
* message: 로그 메시지.

예:

    var commit = {
        files: {
            'FrontPage': 'Welcome to n4wiki',
            'Index': 'List of all pages'
        },
        author: {name: 'Yi, EungJun', mail: 'semtlenori@gmail.com', timezone: '+0900'},
        committer: {name: 'Yi, EungJun', mail: 'semtlenori@gmail.com', timezone: '+0900'},
        message: 'initial commit'
    };

    gitfs.commit(commit, function(err) { if (err) throw err; });

### readObject(id, callback)

주어진 id에 해당하는 Git object 를 읽는다. 읽어들인 object는 callback 함수의 두번째 파라메터로 얻을 수 있으며, 포맷은 그 object가 commit, tree, blob 중 어느 것이냐에 따라 알맞게 정해진다.

예:

    gitfs.readObject(blobId, function(err, content) {
        console.log(content);
    });
    
### show(filename, callback)

주어진 `filename`에 해당하는 파일의 HEAD 시점에서의 내용을 읽는다.

예:

    gitfs.show('README', function(err, content) {
        console.log(content);
    });

### log(filename, callback)

주어진 `filename`에 대한 변경이 있었던 모든 커밋을 HEAD에 가까운 순서대로 가져온다.

예:

    gitfs.log('README', function(err, commits) {
        console.log(commits);
    });

### log_from(filename, from, callback)

`from` 의 자손 커밋 중, 주어진 `filename`에 대한 변경이 있었던 모든 커밋을 `from`에 가까운 순서대로 가져온다.

예:

    gitfs.log('README', '0cc71c0002496eccbe919c2e5f4c0616f9f2e611', function(err, commits) {
        console.log(commits);
    });
