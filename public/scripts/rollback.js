var rollback_handler = function(e) {
    $.post(
        '/api/note/pages/' + this.name,
        { id: this.id, action: 'rollback' },
        function(data) {
            var commits = data.commits;
            var ids = data.ids;
            var name = data.name;
            var tbody = '<tbody id="commits">';
            for (var i = 0; i < commits.length; i++) {
                var date = new Date(commits[i].author.unixtime * 1000)
                tbody += '<tr>';
                tbody += '<td>' + commits[i].author.name + '</td>';
                tbody += '<td>' + date + '</td>';
                tbody += '<td>';
                tbody += '<input type="radio" name="a" value="' + ids[i] + '"/>';
                tbody += '<input type="radio" name="b" value="' + ids[i] + '"/>';
                tbody += '</td>';
                tbody += '<td>' + commits[i].message + '</td>';
                tbody += '<td><a href="#" class="rollback-button" name=' + name + ' id=' + ids[i] + '>Rollback</a></td>';
                tbody += '</tr>';
            }
            tbody += '</tbody>';
            $('#commits').replaceWith(tbody);
            $('.rollback-button').unbind('click');
            $('.rollback-button').click(rollback_handler);
        },
        'json'
    );
}

$('.rollback-button').click(rollback_handler);
