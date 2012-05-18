var lastDomain;
var selected;

var guessMailConfig = function() {
    // Guess mail configuration using the domain part from the given 'from' email address.

    mailAddress = $("#from").val();
    at = mailAddress.lastIndexOf('@');

    if (at < 0) {
        return;
    }

    username = mailAddress.substr(0, at);
    domain = mailAddress.substr(at + 1);

    var wellknowns = {
        "naver.com":{
            service: "Naver",
            host: "smtp.naver.com",
            ssl: false,
            tls: true,
            authMethod: 'LOGIN',
            port: 587,
        },
        "gmail.com":{
            service: "Gmail",
            host: "smtp.gmail.com",
            ssl: true,
            tls: true,
            port: 465,
        },
        "yahoo.com":{
            service: "Yahoo",
            host: "smtp.mail.yahoo.com",
            ssl: true,
            tls: true,
            port: 465,
        },
        "hotmail.com":{
            service: "Hotmail",
            host: "smtp.live.com",
            ssl: false,
            tls: true,
            port: 587,
        },
    }

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
        $("#auto-config-message").html('Your email will be sent using <b>' + selected.service + '</b>.');
        lastDomain = domain;
    }
}

var HideConfigMessageIfHostIsWrong = function() {
    if ($("#host").val().trim().toLowerCase() == selected.host) {
        $("#auto-config-message").html('Your email will be sent using <b>' + selected.service + '</b>.');
    } else {
        $("#auto-config-message").html('');
    }
};

$(document).ready(function init() {
    $("#from").keyup(guessMailConfig);
    $("#host").keyup(HideConfigMessageIfHostIsWrong);

    $("#detailed").on("hide", function() {
        $("#detailed-toggle-message").text(" If you want to see the detailed configuration and/or fix it, ");
        $("#detailed-toggle-link").text('click here.');
    });
    $("#detailed").on("hidden", function() {
        // Don't display #detailed so that tab key ignores it, for user's convenience.
        $("#detailed").css("display", "none");
    });
    $("#detailed").on("show", function() {
        $("#detailed").css("display", "block");
        $("#detailed-toggle-message").text(" If you want to hide the detailed configuration, ");
        $("#detailed-toggle-link").text('click here.');
    });
});
