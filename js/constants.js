//We have to use var instead of const because otherwise Safari on iOS won't know about the variable from modules. Stupid iOS being stupid...
//var API_URL = "https://oh9m8to7dl.execute-api.us-east-1.amazonaws.com/development"
//var WEBSOCKET_URL = "wss://j9lqbcgscd.execute-api.us-east-1.amazonaws.com/development";
var API_URL = "https://ppigk7wzo3.execute-api.us-east-1.amazonaws.com/production";
var WEBSOCKET_URL = "wss://5sdfln8mze.execute-api.us-east-1.amazonaws.com/production";

const setImmersions = (appId, htmlId) => {
    $.ajax({
        url: API_URL + '/app/' + appId,
        type: 'GET',
        contentType: 'application/json',
        dataType: 'json',
        success: function(response) {
            $("#" + htmlId)[0].innerText = response.data.app.immersions;
        },
        error: function(xhr, status, error) {
            $("#" + htmlId)[0].innerText = ":(";
        }
    });
}

const setupButtonClickOnFieldEnter = (buttonId, fieldId) => {
    $("#" + fieldId).keyup(function(event) {
        if (event.originalEvent.code === "Enter") {
            $("#" + buttonId).click();
        }
    });
}
