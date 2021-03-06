
const EXTENSION_TEXT = ' (due to your filter bubble)';

function getQueryFromURL() {
    var regex = new RegExp('[#\?\&]q=([^\&#]+)');
    if(regex.test(window.location.href)) {
        var q = window.location.href.split(regex);
        q = q[q.length - 2].replace(/\+/g," ");

        return decodeURIComponent(q);
    }
}

function firstPage() {
    var regex = new RegExp('[\?\&]start=([^\&#]+)');
    if(regex.test(window.location.href)) {
        if (RegExp.$1 === '0') {
            return true; 
        } else {
            return false;
        }
    }
    return true; 
}

function hoverize(el) {
    tip.hide();

    var classes = $(el).attr('class').split(/\s/);
    var lclass = classes[classes.length - 1];
    $(el).removeClass(lclass);
    $(el).addClass(lclass + '-hover');

    var offset = $(el).offset();

    switch(lclass) {
        case 'ddg_filterbubble_box_removed':
            tip.find('#ddg_filterbubble_tip_cont')
               .html('Result <strong>removed</strong> based on your Google profile.');
            break;
        case 'ddg_filterbubble_box_added':
            tip.find('#ddg_filterbubble_tip_cont')
               .html('Result <strong>inserted</strong> based on your Google profile.');
            break;
        case 'ddg_filterbubble_box_move-up':
            tip.find('#ddg_filterbubble_tip_cont')
               .html('Result <strong>pushed up</strong> based on your Google profile.');
            break;
        case 'ddg_filterbubble_box_move-down':
            tip.find('#ddg_filterbubble_tip_cont')
               .html('Result <strong>pushed down</strong> based on your Google profile.');
            break;
 
    }
    clearTimeout(timeouter);


    tip.mouseover(function(){
            clearTimeout(timeouter);
        })
        .mouseout(function(){
            timeouter = setTimeout(function(){
                tip.fadeOut();
            }, 1500);
        })
        .fadeIn();


    // modal container not appended yet
    if ($($(el).parent()).find('.ddg_filterbubble_modal_container').length == 0) {
        var container = $('<div>').addClass('ddg_filterbubble_modal_container');
        $($(el).parent()).prepend(container);
        $($(el).parent()).css('overflow', 'visible');
    }

    tip.appendTo($($(el).parent()).find('.ddg_filterbubble_modal_container'));

}

function unhoverize(el) {
    var classes = $(el).attr('class').split(/\s/);
    var lclass = classes[classes.length - 1];
    $(el).removeClass(lclass);
    $(el).addClass(lclass.replace('-hover', ''));

    timeouter = setTimeout(function(){
        tip.fadeOut();
    }, 1500);
}




function updateResults() {
    var query = getQueryFromURL();

    //console.log(firstPage());
    if (!firstPage())
        return;

    getAOLResults(query, function(r){

        var cleanResults = [];
        var cleanResultsData = [];
        var dirtyResults = [];


        r.each(function(){

            // ignoring sub-links
            if ($(this).find('a').eq(0).hasClass('sitelink')) {
                return;
            }

            // ignoring news boxes
            if ($(this).find('div').eq(0).hasClass('univ_news')) {
                return;
            }

            // ignore images.
            if ($(this).find('div').eq(0).hasClass('univ_i_co')) {
                return;
            }

            // ignore latest tweets.
            if ($(this).find('ul').eq(0).hasClass('enhBottom_twitter-profile-list')) {
                return;
            }

            var url = $(this).find('a').attr('href');
            var title = $(this).find('a').html();
            var desc = $(this).find('p:not(.find)').html();

            if ($(this).find('.videoDesc').length > 0) {
                desc =  $(this).find('.videoDesc').html();
            }

            cleanResults.push(url);
            cleanResultsData.push({url:url, title:title, desc:desc});
        });


        var results = $('#ires li.g:not(#newsbox):not(.noknav)');
        results.each(function(){
            var url = $(this).find('a').attr('href');

            // skiping In Depth articles
            if ($(this).find(".rd-pub").length == 0) {
                dirtyResults.push(url);
            }
        });

        //console.log(cleanResults);
        //console.log(dirtyResults);


        var iter = 0;
        results.each(function(){
            var url = $(this).find('a').attr('href');
            if (url.indexOf('http') === -1)
                return;

            // skiping In Depth articles
            if ($(this).find(".rd-pub").length !== 0) {
                return;
            }
 
            var index = cleanResults.indexOf(url);
            var span = $('<div>').addClass('ddg_filterbubble_box')
                .click(function(){
                    chrome.runtime.sendMessage({newtab: 'http://dontbubble.us'},
                        function(){});
                    return false;
                }).mouseover(function(){
                    hoverize(this);
                }).mouseout(function(){
                    unhoverize(this);
                });


            if ($('#ddg_filterbubble_tip').size() < 1)
                $('#rcnt').append(tip);


            if (index != -1) {
                if (index != iter) {
                    if (index > iter) {
                        var num = (index - iter);
                        span.html('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + num)
                            .attr('title', 'Link moved up ' + num + 
                                    ' spot' + (num > 1 ? 's':'') + 
                                    EXTENSION_TEXT);
                        span.addClass('ddg_filterbubble_box_move-up');
                    } else {
                        var num = (iter - index);
                        span.html('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +num)
                            .attr('title', 'Link moved down ' + num + 
                                    ' spot' + (num > 1 ? 's':'') + 
                                    EXTENSION_TEXT);
                        span.addClass('ddg_filterbubble_box_move-down');
                    } 
                } else {
                    span.removeClass('ddg_filterbubble_box');
                }

                $(this).find('h3').prepend(span);
            } else {

                span.attr('title', 'Link was added' + EXTENSION_TEXT)
                    .addClass('ddg_filterbubble_box_added');

                $(this).find('h3').prepend(span);
            }


            if (dirtyResults.indexOf(cleanResults[iter]) === -1) {

                if (cleanResultsData[iter] !== undefined) {
                    var generated_result = generateGoogleResult(cleanResultsData[iter]);
                    $(this).after(generated_result);
                    iter += 1;
                    return;
                }

            }

            iter += 1;
        });
    });

}


var tip = $('<div>').attr('id', 'ddg_filterbubble_tip')
        .append($('<div>').attr('id', 'ddg_filterbubble_tip_cont'))
        .append($('<div>').attr('class', 'whitened')
        .html("<p><img src=" + chrome.extension.getURL('/img/legeng_pushed-down.png')+">Downgraded</p>" +
            "<p><img src=" + chrome.extension.getURL('/img/legeng_pushed-up.png')+">Upgraded</p>" +
            "<p><img src=" + chrome.extension.getURL('/img/legeng_inserted.png')+">Inserted</p>" +
            "<p><img src=" + chrome.extension.getURL('/img/legeng_removed.png')+">Removed</p><a href='http://dontbubble.us'>Learn more</a>"));
var timeouter = {};
window.addEventListener("hashchange", updateResults, false);

$(document).ready(function(){
    updateResults();
});


function generateGoogleResult(r) {
    if (r === undefined) return;
    var span = $('<div>')
        .addClass('ddg_filterbubble_box')
        .addClass('ddg_filterbubble_box_removed')
        .attr('title', 'Link was missing' + EXTENSION_TEXT)
        .click(function(){
            chrome.runtime.sendMessage({newtab: 'http://dontbubble.us'},
                function(){});
            return false;
        }).mouseover(function(){
            hoverize(this);
        }).mouseout(function(){
            unhoverize(this);
        });

    var URL = r.url;
    // replacing just http:// -- that's precisely what Google does
    URL = URL.replace(/http:\/\//,"");

    if (URL.length > 76) {
        URL = URL.slice(0, 76) + "...";
    }

    var resultDiv = $('<div>').attr('class', 'vsc');
    resultDiv.append($('<h3>').prepend(span).append(
                $('<a>').attr({href: r.url, class: 'l'})
                .html(r.title)));
    resultDiv.append($('<div>').attr('class', 's').append(
                $('<div>').attr('class', 'f kv').append(
                    $('<cite>').css({'text-overflow': 'ellipsis',
                                     'overflow': 'hidden',
                                     'white-space': 'nowrap'})
                               .html(URL))).append(
                $('<span>').attr('class', 'st').html(r.desc))
            );
    return $('<li>').attr('class', 'g').append(resultDiv);
}

function getAOLResults(query, callback) {
    var url = 'https://duckduckgo.com/dontbubbleus/' + encodeURIComponent(query);

    $.get(url, function(data){
        var r = $('div', data);
        r = r.find('.MSL > ul > li');
        callback(r);
    });
}


