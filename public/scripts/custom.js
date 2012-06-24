jQuery(function($) {
  $('.nHead>.account>.tog').click(function() {
    $(this).parent('.account').next('.search').toggleClass('open');
    if ($('.search').hasClass('open')) {
      $('.search').next('.feedback').hide();
    } else {
      $('.search').next('.feedback').show();
    }
  });
  $(window).resize(function() {
    var ww = $(window).width();
    if (ww >= 700) {
      $('.search').removeClass('open').next('.feedback').show();
    }
  }).resize();
});