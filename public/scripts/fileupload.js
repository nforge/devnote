// ajaxForm Plugin control code
$(function() {

  var addControlToDeleteFileForm = function() {
    var filename;
    var deleteOptions = {
      success: function(text) {
        $('.alert-heading').empty();
        $('.alert-heading').append(' 파일이 삭제 되었습니다.');
        $('#filelist').empty();
        $('#filelist').append(text);
        $('#alert').show();
        $('#attachment').val("");
        $('.filedelete').ajaxForm(deleteOptions);
        setProgressBar(0);
      }
    }
    $('.filedelete').ajaxForm(deleteOptions);
  }

  var setProgressBar = function(value) {
    $('#progressbar').css("width", value + "%");
    $('#progressbar').text(value + "%");
  }

  var _getFileNameOnly = function(filename) {
    var fakepath = 'fakepath';
    var fakepathPostion = filename.indexOf(fakepath);
    if (fakepathPostion > -1) {
      filename = filename.substring(fakepath.length + fakepathPostion + 1);
    }
    return filename;
  }

  var insertLinkIntoBody = function() {
    $('.insertInto').trigger('click');
  }

  var _replaceFileInputControl = function() {
    $("#attachment").replaceWith("<input type='file' name='attachment' id='attachment' >");
  }
  var fileUploadOptions = {
    beforeSubmit: function() {
      var filename = _getFileNameOnly($('#attachment').val());

      // show message box
      $('#alert').removeClass('out');
      $('#alert').addClass('in');
      if (filename === "") {
        $('.alert-heading').html('업로드할 파일을 선택해 주세요');
        $('#alert').show();
        return false;
      }
      return true;
    },
    success: function(text) {
      var filename = _getFileNameOnly($('#attachment').val());

      $('.alert-heading').html(filename + ' 파일이 업로드 되었습니다.');
      $('#filelist').html(text);
      $('#alert').show();
      _replaceFileInputControl();
      addControlToDeleteFileForm(filename);
      setProgressBar(100);
      insertLinkIntoBody();
    },
    uploadProgress: function(event, position, total, percentComplete) {
      setProgressBar(percentComplete);
    }
  }

  $('#fileupload').ajaxForm(fileUploadOptions);

  $('#attachment').click(function(event) {
    setProgressBar(0);
    $('#alert').hide();
  });
  $('#fileupload').change(function(event) {
    if ($('#attachment').val() !== "") {
      $('#fileupload').submit();
    }
  });
})
