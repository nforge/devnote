N4WIKI Models
=============

- blob은 문자열로 다룬다.

    var blob = "0cc71c0002496eccbe919c2e5f4c0616f9f2e611";

- tree의 각 entry는 파일이름을 JSON key 이름, 해당 파일의 sha1 값을 value로 표시한다.
    var tree = {
            "Makefile": "ad5daf27e84461244dd9cb4760678886d875d9a6",
            "README": "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391",
            "gitfs.js": 55f228e3ce568fe0237c59a891963ad713e7d23c",
            "package.json": "0c3929df90b4aefcc4ad3181033017ece2c4da88"
        }
    
- commit은 tree, parent, author, commiter, message를 key로 갖는다. author와 commiter는 name, email, unixtime, timezone을 내장 json의 key로 갖는다.

    var commit = {
                tree: "635a6d85573c97658e6cd4511067f2e4f3fe48cb",
                parent: "0cc71c0002496eccbe919c2e5f4c0616f9f2e611",
                author: {
                    name: "Yi, EungJun",
                    email: "semtlenori@gmail.com",
                    unixtime: "1333091842",
                    timezone: "+0900"
                },
                commiter: {
                    name: "Yi, EungJun",
                    email: "semtlenori@gmail.com",
                    unixtime: "1333091842",
                    timezone: "+0900"
                },
                message: "Added test"
    };

    var commitRequest = {
                files: {},
                author: {
                    name: "Yi, EungJun",
                    email: "semtlenori@gmail.com",
                    unixtime: "1333091842",
                    timezone: "+0900"
                },
                commiter: {
                    name: "Yi, EungJun",
                    email: "semtlenori@gmail.com",
                    unixtime: "1333091842",
                    timezone: "+0900"
                },
                message: "Added test"
    };

- log query

    var logQuery = {
        filename: 'frontpage',  // 디렉토리를 지원하게 되면 path 로 이름을 바꾸는 것이 좋을 것이다.
        until: 'f96845522d7a2de3c0c4677ac96f6640ceb19055',  // 가져올 커밋의 범위 (이 커밋까지)
        offset: 1,                                          // until에 대한 offset (음수도 가능)
        since: '0cc71c0002496eccbe919c2e5f4c0616f9f2e611',  // 가져올 커밋의 범위 (이 커밋 이후)
        limit: 30                                           // 가져올 커밋의 최대 갯수
    }

    위 query 는 아래의 git 명령과 같다.

    git log -30 0cc71c0002496eccbe919c2e5f4c0616f9f2e611..f96845522d7a2de3c0c4677ac96f6640ceb19055^1 -- frontpage

- page

    var page = {
        content: 'welcome to n4wiki'                          // 본문
        commitId: '0cc71c0002496eccbe919c2e5f4c0616f9f2e611', // 이 페이지가 속한 커밋의 id
        commit: commit,                                       // 이 페이지가 속한 커밋
        isOld: false                                          // 이 페이지의 내용이 최신 버전과 같은지
    }
