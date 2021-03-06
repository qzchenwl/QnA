var sitemap = {}
var show_pages = 10;
var questions;
var tags;
var pagination;
var question_answers;

// markdown and highlight
var converter = new Showdown.converter;
var maxDelay = 3000; // ms
var minDelay = 100;
var processingTime = 0;
var lastText;
var converterTimer;

function initTemplate() {
    questions = Tempo.prepare('questions');
    tags = Tempo.prepare('tags');
    pagination = Tempo.prepare('pagination');

    question_answers = Tempo.prepare('question_answers');
}

function buildMap() {
    sitemap["questions"] = listQuestions;
    sitemap["tags"] = listTags;
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

    $.getJSON("/question-list", query_data, renderQuestions).fail(function(jqXHR) { alert(jqXHR.responseText); });
}

function listTags() {
    setLocation({}, 'tags');
    hideMain();
    $("#tags").show();

    $.getJSON("/tags", renderTags).fail(function(jqXHR) { alert(jqXHR.responseText); });
}

function showQuestion(query_data) {
    setLocation(query_data, 'question');
    hideMain();
    $("#question-page").show();
    $.getJSON("/question-answers", query_data, renderQuestionPage).fail(function(jqXHR) { alert(jqXHR.responseText); });
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
        if (isBlank(d)) {
            continue;
        }
        query_strings.push(encodeURIComponent(d) + "=" + encodeURIComponent(query_data[d]));
    }
    return query_strings.join("&");
}

function setLocation(query_data, where) {
    var queryString = buildQueryString(query_data);
    if (!isBlank(queryString)) {
        queryString = '?' + queryString;
    }
    window.location.hash = '#!/' + where + '/' + queryString;
}

// END display pages

// START render pages
function renderQuestions(data) {
    console.log("renderQuestions");
    questions.clear();
    questions.render(data.questions);
    // render pagination
    var all = data.page_count;
    var current = data.current_page;

    var start_page = Math.max(1, current - show_pages/2);
    var end_page = Math.min(all, show_pages + start_page - 1);
    var pages = [];
    var prev_page = {};
    prev_page.text = "<";
    prev_page.page = current - 1;
    if (current == 1) { prev_page.class="disabled"; }
    pages.push(prev_page);
    for (var i = start_page; i <= end_page; ++i) {
        var page = {};
        page.text = i;
        page.page = i;
        if (current == i) { page.class="disabled"; }
        pages.push(page);
    }
    var next_page = {};
    next_page.text = ">";
    next_page.page = current + 1;
    if (current == all) { next_page.class="disabled"; }
    pages.push(next_page);
    pagination.clear();
    pagination.render(pages);
    registerAll();
}

function renderTags(data) {
    tags.render(data.tags);
    convertAll();
    registerAll();
}

function renderQuestionPage(data) {
    question_answers.render(data.question_answers);
    convertAll();
    registerAll();
}
// END render pages

// START register listeners
function registerOnce() {

    $("#ask-form").submit(function(e){
        e.preventDefault();
        $.getJSON('/ask-question', $(this).serialize(), showQuestion).fail(function(jqXHR) { alert(jqXHR.responseText); });
    });

    $("#show-question-list").click(function(){
        listQuestions();
        $('#nav li').removeClass('active');
        $('#show-question-list').addClass('active');
        return false;
    });

    $("#show-tags").click(function() {
        listTags();
        $('#nav li').removeClass('active');
        $('#show-tags').addClass('active');
        return false;
    });

    $("#show-unanswered").click(function() {
        listQuestions({unanswered: true});
        $('#nav li').removeClass('active');
        $('#show-unanswered').addClass('active');
        return false;
    });

    $("#show-ask-page").click(function() {
        askQuestion();
        return false;
    });

    $("#ask-edit").keyup(onMarkdownInput);
    $("#ask-edit").keydown(function(e) {

    if(e.keyCode === 9) { // tab was pressed
        // get caret position/selection
        var start = this.selectionStart;
        var end = this.selectionEnd;

        var value = $(this).val();

        // set textarea value to: text before caret + tab + text after caret
        $(this).val(value.substring(0, start)
            + "\t"
            + value.substring(end));

        // put caret at right position again (add one for the tab)
        this.selectionStart = this.selectionEnd = start + 1;

        // prevent the focus lose
        e.preventDefault();
        return false;
    }});
}

function registerAll() {
    console.log($(this));
    console.log("registerAll");
    $("textarea.markdown").not("#ask-edit").keyup(onMarkdownInput);

    $("#answer-form").submit(function(e){
        e.preventDefault();
        $.getJSON('/answer-question', $(this).serialize(), showQuestion).fail(function(jqXHR) { alert(jqXHR.responseText); });
    });

    $(".update-question").submit(function(e){
        e.preventDefault();
        $.getJSON('/update-question', $(this).serialize(), showQuestion).fail(function(jqXHR) { alert(jqXHR.responseText); });
    });

    $(".update-answer").submit(function(e){
        e.preventDefault();
        $.getJSON('/update-answer', $(this).serialize(), showQuestion).fail(function(jqXHR) { alert(jqXHR.responseText); });
    });

    $(".question-comment-form").submit(function(e){
        e.preventDefault();
        $.getJSON('/comment-question', $(this).serialize(), showQuestion).fail(function(jqXHR) { alert(jqXHR.responseText); });
    });

    $(".answer-comment-form").submit(function(e){
        e.preventDefault();
        $.getJSON('/comment-answer', $(this).serialize(), showQuestion).fail(function(jqXHR) {alert(jqXHR.responseText); });
    });

    $(".edit").click(function(){
        $(this).parent().siblings(".post").find(".edit-pane, .update, input").toggle();
        $(this).parent().siblings(".post").find(".edit-pane").focus();
        return false;
    });
    $(".delete-question").click(function(){
        var id = $(this).attr('data');
        $.getJSON('/delete-question', 'id=' + id, listQuestions).fail(function(jqXHR) { alert(jqXHR.responseText); });
        return false;
    });
    $(".delete-answer").click(function(){
        var id = $(this).attr('data');
        $.getJSON('/delete-answer', 'id=' + id, showQuestion).fail(function(jqXHR) { alert(jqXHR.responseText); });
        return false;
    });

    $(".submit-comment").click(function() {
        $(this).siblings("form").toggle();
        return false;
    });

    $(".question .upvote").click(function(){
        var id = $(this).attr("data");
        $.getJSON('/vote-question', "vote=1&id=" + id, showQuestion).fail(function(jqXHR) { alert(jqXHR.responseText); });
        return false;
    });
    $(".question .downvote").click(function(){
        var id = $(this).attr("data");
        $.getJSON('/vote-question', "vote=-1&id=" + id, showQuestion).fail(function(jqXHR) { alert(jqXHR.responseText); });
        return false;
    });

    $(".answer .upvote").click(function(){
        var id = $(this).attr("data");
        $.getJSON('/vote-answer', "vote=1&id=" + id, showQuestion).fail(function(jqXHR) { alert(jqXHR.responseText); });
        return false;
    });
    $(".answer .downvote").click(function(){
        var id = $(this).attr("data");
        $.getJSON('/vote-answer', "vote=-1&id=" + id, showQuestion).fail(function(jqXHR) { alert(jqXHR.responseText); });
        return false;
    });

    $(".question-link").click(function(){
        var id = $(this).attr("data");
        showQuestion({id: id});
        return false;
    });

    $(".tags > a").click(function(){
        var tag = $(this).attr('data');
        listQuestions({tag: tag});
        return false;
    });

    $("#pagination > li > a").click(function() {
        var page = $(this).attr('data');
        var data = getPathAndQueryData();
        data.query_data['page'] = page;

        var action = sitemap[data.path];
        if (action) {
            action(data.query_data);
        } else {
            console.log(data.path + " not found");
            listQuestions();
        }
        return false;
    });

    // allow tab for textarea
    $("textarea").not("#ask-edit").keydown(function(e) {

    if(e.keyCode === 9) { // tab was pressed
        // get caret position/selection
        var start = this.selectionStart;
        var end = this.selectionEnd;

        var value = $(this).val();

        // set textarea value to: text before caret + tab + text after caret
        $(this).val(value.substring(0, start)
            + "\t"
            + value.substring(end));

        // put caret at right position again (add one for the tab)
        this.selectionStart = this.selectionEnd = start + 1;

        // prevent the focus lose
        e.preventDefault();
        return false;
    }});
}
// END register listeners
function getPathAndQueryData() {
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
    return {path: path, query_data: query_data};
}

function getPathAndParameter() {
    var data = getPathAndQueryData();

    var action = sitemap[data.path];
    if (action) {
        action(data.query_data);
    } else {
        console.log(data.path + " not found");
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
    console.log("convertAll1111");
    var body = $("body");
    $(gist_embed(body));
    console.log("gist_embed");
}

function onMarkdownInput() {
    console.log("onMarkdownInput");

    var $this = $(this);

    if(converterTimer) {
        window.clearTimeout(converterTimer);
        converterTimer = undefined;
    }

    var timeUntilConvert = processingTime;

    if (timeUntilConvert > maxDelay) {
        timeUntilConvert = maxDelay;
    }
    if (timeUntilConvert < minDelay) {
        timeUntilConvert = minDelay;
    }

    converterTimer = window.setTimeout(function() {    

        var startTime = new Date().getTime();


        var markdown = $this.val();
        if (lastText == markdown) { return; }

        var preview = $this.siblings(".preview");
        var html = converter.makeHtml(markdown);
        preview.html(html);

        preview.find("pre > code").each(function (i,e) { hljs.highlightBlock(e); });

        $(gist_embed(preview));

        var endTime = new Date().getTime();

        processingTime = endTime - startTime;

        console.log("startTime = " + startTime);
        console.log("processingTime = " + processingTime);

    }, timeUntilConvert);

}

// login logout
function logInOut() {
    navigator.id.watch({
        loggedInUser: getCookie('user'),
        onlogin: function(assertion) {
            $.ajax({
                type: 'POST',
                url: '/auth/login',
                data: {assertion: assertion},
                dataType: 'json',
                success: function(data) {
                    if (data.status == "okay") {
                        console.log(data);
                        $("#signout").show();
                        $("#signin").hide();
                    } else {
                        console.log(JSON.stringify(data));
                        alert(JSON.stringify(data));
                    }
                }});
        },
        onlogout: function() {
            // 一个用户已经登出！这是你需要做的：
            // 销毁用户的会话并重定向用户或做后端的调用。
            // 同样，让 loggedInUser 在下个页面加载时变为 null。
            // （这是一个字面的 JavaScript null。不是 false、 0 或 undefined。null。)
            $.ajax({
                type: 'POST',
                url: '/auth/logout', // 这是你网站上的一个 URL
                success: function(res, status, xhr) { window.location.reload(); },
                error: function(res, status, xhr) { alert("登出失败" + res); }
            });}
    });
    $("#signin").click(function() {
        navigator.id.request();
        return false;
    });
    $("#signout").click(function() {
        console.log("logout click");
        navigator.id.logout();
        return false;
    });

}
// cookie
function setCookie(name,value)
{
  var Days = 30; //此 cookie 将被保存 30 天
  var exp  = new Date();    //new Date("December 31, 9998");
  exp.setTime(exp.getTime() + Days*24*60*60*1000);
  document.cookie = name + "="+ escape(value) +";expires="+ exp.toGMTString();
}
function getCookie(name)
{
  var arr = document.cookie.match(new RegExp("(^| )"+name+"=([^;]*)(;|$)"));
  if(arr != null) return unescape(arr[2]); return null;
}
function delCookie(name)
{
  var exp = new Date();
  exp.setTime(exp.getTime() - 1);
  var cval=getCookie(name);
  if(cval!=null) document.cookie=name +"="+cval+";expires="+exp.toGMTString();
}
function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}

$(document).ready(function () {
    console.log('window load');
    initTemplate();
    buildMap();
    getPathAndParameter();
    registerOnce();
    logInOut();
    (function() {
  var proxied = window.alert;
  window.alert = function() {
    // do something here
    return proxied.apply(this, arguments);
  };
})();
});


