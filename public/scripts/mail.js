var lastDomain;
var selected;

// Guess mail configuration using the domain part from the given 'from' email address.
var guessMailConfig = function() {
  mailAddress = $("#from").val();
  at = mailAddress.lastIndexOf('@');

  if (at < 0) {
    return;
  }

  username = mailAddress.substr(0, at);
  domain = mailAddress.substr(at + 1);

  var wellknowns = {
    "naver.com": {
      service: "Naver",
      host: "smtp.naver.com",
      ssl: false,
      tls: true,
      authMethod: 'LOGIN',
      port: 587
    },
    "gmail.com": {
      service: "Gmail",
      host: "smtp.gmail.com",
      ssl: true,
      tls: true,
      port: 465
    },
    "yahoo.com": {
      service: "Yahoo",
      host: "smtp.mail.yahoo.com",
      ssl: true,
      tls: true,
      port: 465
    },
    "hotmail.com": {
      service: "Hotmail",
      host: "smtp.live.com",
      ssl: false,
      tls: true,
      port: 587
    }
  };

  selected = wellknowns[domain];

  if (selected && domain != lastDomain) {
    $("#username").val(username);
    $("#authMethod").val(selected.authMethod);
    $("#host").val(selected.host);
    $("#port").val(selected.port);
    $("#ssl").prop('checked', selected.ssl);
    $("#tls").prop('checked', selected.tls);
    if (!lastDomain && $("#detailed").hasClass('in')) {
      $("#detailed").collapse("hide");
    }
    $("#auto-config-alert").css("display", "block");
    _updateUsingServiceMessage(selected.service);
    lastDomain = domain;
  }
};

var _clearUsingServiceMessage = function() {
  $("#using-wellknown-service-message").html('');
};

var _updateUsingServiceMessage = function(service) {
  $("#using-wellknown-service-message").html(i18n.__('Your email will be sent using <b>%s</b>.', service));
};

// Hide using-wellknown-service-message if configured host differs from selected service's.
var updateUsingServiceMessage = function() {
  if ($.trim($("#host").val()).toLowerCase() == selected.host) {
    _updateUsingServiceMessage(selected.service);
  } else {
    _clearUsingServiceMessage();
  }
};

$(function() {
  i18n.onReady(function() {
    var $detailed = $('#detailed');
    $("#from").keyup(guessMailConfig);
    $("#host").keyup(updateUsingServiceMessage);

    $detailed.on("hide", function() {
      $("#detailed-toggle-message").text(i18n.__(' If you want to see the detailed configuration and/or fix it, '));
      $("#detailed-toggle-link").text(i18n.__('click here.'));
    }).on("hidden", function() {
      // Don't display #detailed so that tab key ignores it, for user's convenience.
      $detailed.css("display", "none");
    }).on("show", function() {
      $detailed.css("display", "block");
      $("#detailed-toggle-message").text(i18n.__(" If you want to hide the detailed configuration, "));
      $("#detailed-toggle-link").text(i18n.__('click here.'));
    });
  });
});
