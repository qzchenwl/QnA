var sitemap = {}
var questions;
var pagination;
var question_answers;

// markdown and highlight
var converter = new Showdown.converter;
var lastText = undefined;

function initTemplate() {
    questions = Tempo.prepare('questions');
    pagination = Tempo.prepare('pagination');

    question_answers = Tempo.prepare('question_answers');
}

function buildMap() {
    sitemap["questions"] = listQuestions;
    sitemap["question"] = showQuestion;
    sitemap["ask"] = askQuestion;
}

// START display pages
function listQuestions(query_data) {
    setLocation(query_data, 'questions');
    hideMain();
    console.log(query_data);
    // hideMain();
    $("#question-list").show();

    $.getJSON("/question-list", query_data, renderQuestions);
}

function showQuestion(query_data) {
    setLocation(query_data, 'question');
    hideMain();
    $("#question-page").show();
    $.getJSON("/question-answers", query_data, renderQuestionPage);
}

function askQuestion() {
    setLocation({}, 'ask');
    hideMain();
    $("#ask-question").show();
}

function hideMain() {
    $("#main").children().each(function (i, e) {$(e).hide()});
}

function buildQueryString(query_data) {
    var query_strings = []
    for (var d in query_data) {
        query_strings.push(encodeURIComponent(d) + "=" + encodeURIComponent(query_data[d]));
    }
    return query_strings.join("&");
}

function setLocation(query_data, where) {
    window.location.hash = '#!/' + where + '/?' + buildQueryString(query_data);
}

// END display pages

// START render pages
function renderQuestions(data) {
    questions.clear();
    questions.render(data.questions);
    // render pagination
    var all = data.pages;
    var current = data.current_page;
    var show_count = 10;
    var start_page = Math.max(1, current - show_count/2);
    var end_page = Math.max(current, show_count + start_page - 1);
    var pages = [];
    var prev_page = {};
    prev_page.text = "<";
    if (current == 1) { prev_page.class="disabled"; }
    pages.push(prev_page);
    for (var i = start_page; i <= end_page; ++i) {
        var page = {};
        page.text = i;
        if (current == i) { page.class="disabled"; }
        pages.push(page);
    }
    var next_page = {};
    next_page.text = ">";
    if (current == all) { next_page.class="disabled"; }
    pages.push(next_page);
    pagination.clear();
    pagination.render(pages);
    registerAll();
}

function renderQuestionPage(data) {
    question_answers.render(data.question_answers);
    convertAll();
    registerAll();
}
// END render pages

// START register listeners
function registerAll() {
    console.log("registerAll");
    $("#answer-edit").keyup(onAnswerInput);
    $("#ask-edit").keyup(onAskInput);

    $("#ask-form").submit(function(e){
        e.preventDefault();
        $.getJSON('/ask-question', $(this).serialize(), showQuestion);
    });

    $("#answer-form").submit(function(e){
        e.preventDefault();
        $.getJSON('/answer-question', $(this).serialize(), showQuestion);
    });

    $("#show-ask-page").click(askQuestion);
    $("#show-question-list").click(function(){
        listQuestions();
        return false;
    });

    $(".question-link").click(function(){
        var id = $(this).attr("data");
        showQuestion({id: id});
        return false;
    });

    // allow tab for textarea
    $("textarea").keydown(function(e) {
    if(e.keyCode === 9) { // tab was pressed
        // get caret position/selection
        var start = this.selectionStart;
        var end = this.selectionEnd;

        var $this = $(this);
        var value = $this.val();

        // set textarea value to: text before caret + tab + text after caret
        $this.val(value.substring(0, start)
            + "\t"
            + value.substring(end));

        // put caret at right position again (add one for the tab)
        this.selectionStart = this.selectionEnd = start + 1;

        // prevent the focus lose
        e.preventDefault();
    }
});
}
// END register listeners

function getPathAndParameter() {
    var hash = window.location.hash.substr(3);
    var query = window.location.toString().split('?')[1];
    if (typeof query === "undefined") { query = ""; }
    var path = hash.split('/')[0];

    var query_data = {};
    var querys = query.split('&');
    for (var i = 0; i < querys.length; i++) {
        var pair = querys[i].split('=');
        if (typeof query_data[pair[0]] === 'undefined') {
            query_data[pair[0]] = pair[1];
        }  else {
            query_data[pair[0]] = pair[1];
        }
    }

    var action = sitemap[path];
    if (action) {
        action(query_data);
    } else {
        console.log(path + " not found");
        listQuestions();
    }
}


// markdown and highlight
function highlightAll() {
    $(".preview > pre > code").each(function (i, e) {
        hljs.highlightBlock(e);
    });
}

function convertAll() {
    var markdown = $(".markdown");
    markdown.each(function (i, e) {
        var text = converter.makeHtml(e.value);
        $(e).siblings(".preview").each(function (i, e) {
            $(e).html(text);
        });
    });
    highlightAll();
    $(gist_embed());
}

function onAnswerInput() {
    if (lastText == $("#answer-edit").val()) {
        return;
    }
    lastText = $("#answer-edit").val();
    var text = converter.makeHtml(lastText);
    $("#answer-preview").html(text);  //  Access-Control-Allow-Origin

    // highlight code
    $("#answer-preview > pre > code").each(function (i, e) { hljs.highlightBlock(e); });

    // embed gist
    $(gist_embed());
}

function onAskInput() {
    if (lastText == $("#ask-edit").val()) {
        return;
    }
    lastText = $("#ask-edit").val();
    var text = converter.makeHtml(lastText);
    $("#ask-preview").html(text);

    $("#ask-preview > pre > code").each(function (i, e) { hljs.highlightBlock(e); });

    $(gist_embed());
}

$(document).ready(function () {
    console.log('window load');
    initTemplate();
    buildMap();
    getPathAndParameter();
    registerAll();
});
