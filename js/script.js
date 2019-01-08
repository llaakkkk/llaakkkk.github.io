// let channelId // channel_post.chat.id;
// let botId // your bot id
// let chatId = // channel id
// let botChatId = // your chat with bot id
let apiUrl = 'https://api.telegram.org/';
let apiDataUrl = apiUrl + botId;
let apiFilesUrl = apiUrl + 'file/' + botId + '/';
let postsPerPage = 5;
let telegramPostsDiv = $('.telegram_posts');
let pagination = $('.pagination-sm');

$(document).ready(function () {

    getTelegramPosts();

    $("#search-text").keyup(function () {
        let searchTerm = $("#search-text").val();
        if (searchTerm == '') {
            $('.clear-results').addClass('hidden');
        } else {
            $('.clear-results').removeClass('hidden');
        }
        searchPosts(searchTerm);
    });

    $('.clear-results').on('click', function (e) {
        e.preventDefault();
        $('#search-text').val('');
        $(this).addClass('hidden');
        searchPosts('');
    })

    $('.hashtag').on('click', 'a[data-hash-search="true"]', function (e) {
        e.preventDefault();
        $('.hashtag').empty();
        paginatePosts(JSON.parse(localStorage.getItem('telegramPosts')));
    });

    $('#contact_me_form').validate({
        onfocusout: false,
        onkeyup: false,
        onclick: false,
        rules: {
            "cname": {
                required: true,
                minlength: 2
            },
            "cemail": {
                required: true,
                email: true,
                minlength: 2
            },
            "cmessage": {
                required: true,
                minlength: 10,
                maxlength: 400
            }
        },
        messages: {
            "cname": {
                required: "Enter a name.",
                "acname": "Enter a valid name."
            },
            "cemail": {
                required: "Enter a email.",
                "cemail": "Enter a valid email."
            },
            "cmessage": {
                required: "Enter your message.",
                "cmessage": "Enter a valid message."
            }
        },
        submitHandler: function (form) {
            let text = preparedTextFromFormData($(form).serializeArray());

            sendMessageToBot(text, form);
            return false;
        }
    });

    $('.notification a').on('click', function (e) {
        e.preventDefault();
        $(this).parent('.notification').addClass('hidden');

    })
});

telegramPostsDiv.on('click', 'a[data-hash-link="true"]', function (e) {
    e.preventDefault();
    let hashTag = $(this).attr('href');

    $('.hashtag').empty().append('<a href="#" data-hash-search="true">' + hashTag + ' <i class="fas fa-times"></i></a>');
    searchPosts(hashTag);
});

// logic functions
function showTelegramPosts(posts) {

    posts = filterPostDataByChannelPosts(posts);
    posts = sortPostDataDesc(posts);

    localStorage.setItem('telegramPosts', JSON.stringify(posts));
    paginatePosts(posts);
}

function paginatePosts(posts) {
    let postsCount = posts.length;

    if (postsCount === 0) {
        emptyTelegramDiv();
        return;
    }
    showPostsCount(postsCount);
    preparePaginationOptions(posts, postsCount);

}

function structureData(posts) {
    telegramPostsDiv.empty();

    $.each(posts, function (i, post) {
        let channelPost = post['channel_post'];
        let timestamp = channelPost['date'];
        let date = formatDate(new Date(timestamp * 1000));

        if (channelPost['photo']) {
            addPhotoPostToHtml(channelPost['photo'], date);
        }

        let text;
        if (text = channelPost['text']) {
            text = hashtag(text);
            text = linkify(text);

            addPostToHtml(text, date);
        }
    });
}

function addPostToHtml(text, date) {
    let html = '<div class="telegram_posts_item"><span>' + date + '</span><p>' + text + '</p></div>';
    telegramPostsDiv.append(html)
}

function addPhotoPostToHtml(photos, date) {
    let photo = $(photos).last();
    setPhotoToPost(photo[0]['file_id'], date);
}

function touchPhotoToPost(filePath, date) {
    let html = '<div class="telegram_posts_item"><span>' + date + '</span><img src="' + apiFilesUrl + filePath + '"></img></div>';
    telegramPostsDiv.append(html)
}

function setPhotoToPost(file_id, date) {
    $.ajax({
        type: 'GET',
        async: false,
        url: apiDataUrl + "/getFile?file_id=" + file_id,
        success: function (data) {
            touchPhotoToPost(data['result']['file_path'], date)
        }
    });
}

function getTelegramPosts() {
    $.ajax({
        type: 'GET',
        url: apiDataUrl + "/getUpdates?chat_id=" + chatId,
        timeout: 5000,
        success: function (data) {
            showTelegramPosts(data.result);
        },
        error: function (xhr, textStatus, errorThrown) {
            if (localStorage.getItem('telegramPosts')) {
                paginatePosts(JSON.parse(localStorage.getItem('telegramPosts')));
            } else {
                telegramPostsDiv.append('<p>Something happen try to check your internet connection</p>')
            }
        }
    });
}

function validateSearchString(searchString) {

    if (searchString === '') {
        let listItem = JSON.parse(localStorage.getItem('telegramPosts'));
        paginatePosts(listItem);
        return false;
    }
    let format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
    if (format.test(searchString)) {
        return false;
    }
}

function filteredSearchPosts(searchTerm) {
    let posts = JSON.parse(localStorage.getItem('telegramPosts'));

    let filteredPosts = [];
    $.each(posts, function (i, post) {
        let channelPost = post['channel_post'];
        let text;
        if (text = channelPost['text']) {
            if (text.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1) {
                filteredPosts.push(post);
            }
        }
    });
    return filteredPosts;
}

function emptyTelegramDiv() {
    telegramPostsDiv.empty()
    $('.list-count').text('0 items');
    $('.empty-item').removeClass('hidden')
}

function searchPosts(searchTerm) {

    validateSearchString(searchTerm);

    let filteredPosts = filteredSearchPosts(searchTerm);
    paginatePosts(filteredPosts);
}

function showPostsCount(postsCount) {
    $('.empty-item').addClass('hidden');
    $('.list-count').text(postsCount + ' items');

}

function preparePaginationOptions(posts, postsCount) {

    let pagesCount = Math.ceil(postsCount / postsPerPage);
    let visiblePages = Math.ceil(pagesCount * 0.4);

    pagination.twbsPagination('destroy');

    let defaultOpts = {
        visiblePages: visiblePages,
        totalPages: pagesCount,
        items: postsCount,
        itemOnPage: postsPerPage,
        currentPage: 1,
        onPageClick: function (evt, page) {
            let from = (parseInt(page) - 1) * parseInt(postsPerPage);
            let to = parseInt(page) * parseInt(postsPerPage);

            let paginatedPosts = posts.slice(from, to)
            structureData(paginatedPosts);
        }
    };

    pagination.twbsPagination(defaultOpts);
}

function preparedTextFromFormData(data) {

    let messageString = 'You have message from your website!\r\n';
    $.each(data, function (i, val) {

        switch (val.name) {
            case 'cname':
                messageString += 'Name: ' + val.value + '\r\n';
                break;
            case 'cemail':
                messageString += 'Email: ' + val.value + '\r\n';
                break;
            case 'cmessage':
                messageString += 'Message for you: ' + val.value + '\r\n';
                break;
            default:
                messageString += 'Something goes wrong!\r\n'
        }
    });
    messageString += 'Answer please to your follower. \r\n';
    return messageString;
}

function showInfoFormSent(className) {
    $('.' + className).removeClass('hidden');
    $('html, body').animate({
        scrollTop: $('.' + className).offset().top
    }, 1000);
}

function sendMessageToBot(text, form) {
    $.ajax({
        type: 'GET',
        url: apiDataUrl + "/sendMessage?chat_id=" + botChatId + '&text=' + encodeURI(text),
        success: function (data) {
            showInfoFormSent('contact_notification');
            $(form).trigger('reset');
        },
        error: function (xhr, textStatus, errorThrown) {
            showInfoFormSent('contact_notification_error');
        }
    });
}

// helped functions
function filterPostDataByChannelPosts(data) {
    data = data.filter(function (item) {

        if (item['channel_post'] !== undefined) {
            if (item['channel_post']['text'] !== undefined || item['channel_post']['photo'] !== undefined) {
                return item['channel_post']['chat']['id'] === channelId;
            }
        }
        return false;
    });
    return data;
}

function sortPostDataDesc(data) {

    function compareFunction(a, b) {
        if (a['update_id'] > b['update_id']) {
            return -1;
        }
        else {
            return 1;

        }
    }

    return data.sort(compareFunction);


}

function formatDate(date) {
    let monthNames = [
        "January", "February", "March",
        "April", "May", "June", "July",
        "August", "September", "October",
        "November", "December"
    ];

    let day = date.getDate();
    let monthIndex = date.getMonth();
    let year = date.getFullYear();

    return day + ' ' + monthNames[monthIndex] + ' ' + year;
}

function linkify(inputText) {
    let replacedText, replacePattern1, replacePattern2, replacePattern3;

    //URLs starting with http://, https://, or ftp://
    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
    replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

    //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

    //Change email addresses to mailto:: links.
    replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
    replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

    return replacedText;
}

function hashtag(text) {
    return text.replace(/#(\w+)/g, '<a href="#$1" data-hash-link="true">#$1</a>');
}


