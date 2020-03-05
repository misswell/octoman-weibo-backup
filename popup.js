document.addEventListener('DOMContentLoaded', function () {
    events.current_page();

    $('body').on('click', '.item', function (elm) {

        let ratio = $("#ratio").val();
        let open = $("#open-folder:checked").val();
        let down_allow = $("#con-current").val();

        $(this).find('.selected').show();
        $(this).find('.complete').show().text('等待下载');

        let album_id = $(this).data('albid');
        let uid = $(this).data('uid');
        let caption = $(this).data('caption');
        let type = $(this).data('type');
        let name = $(this).data('name');

        let data = {
            album_id: album_id,
            uid: uid,
            caption: caption,
            type: type,
            name: name,
            ratio: ratio,
            open: open,
            down_allow: down_allow,
        };
        events.down_album(data)
    });

    $('body').on('change', 'select.album-select', function (elm) {
        let uid2 = $(this).val();
        let name2 = $.trim($(this).find('option:selected').text());
        $('.album-loading').show();
        $('.album-list').hide();
        events.user_info({uid: uid2, name: name2})
    });

    $('body').on('click', '.wei-save', function () {
        let containerid = $(this).data('containerid');
        let uid = $(this).data('uid');
        let username = $(this).data('username');
        $(this).addClass('disable');
        $(this).removeClass('wei-save');
        events.wei_save({containerid: containerid, user: {uid: uid, username: username}});
    });

    $("#stop-all").click(function () {
        $(this).addClass('disable');
        events.todo('stop_all');
    });

    $("#author").click(function () {
        window.open('https://blog.liuguofeng.com/p/5670')
    });

    $('body').on('click', '#load-timeout', function () {
        window.open('https://m.weibo.cn')
    });

    events.last_process();

    setTimeout(function () {
        if (!$('.album-loading').is(':hidden')) {
            $("#load-timeout").html(' 验证出错，请点击此链接，然后返回重试')
        }
    }, 3000);

    $(".warning-icon").mouseover(function () {
        $(".warning-more").slideDown();
    });
    $(".warning-icon").mouseleave(function () {
        $(".warning-more").slideUp();
    });


    $("#option").click(function () {
        events.option()
    });
});

var bg = chrome.extension.getBackgroundPage();

var events = {

    option: () => {
        typeof(chrome.app.isInstalled) !== "undefined" && chrome.runtime.sendMessage({type: 'option'})
    },
        current_page: () => {
            chrome.runtime.sendMessage({type: 'current_page'})
        },
        user_info: (data) => {
            chrome.runtime.sendMessage({type: 'user_info', data: data}, function () {

            })
        },
        wei_save: (data) => {
            chrome.runtime.sendMessage({type: 'wei_save', data: data}, function () {

            })
        },
        last_process: () => {
            chrome.runtime.sendMessage({type: 'last_process'}, function () {

            })
        },
        todo:(data)=>{
            chrome.runtime.sendMessage({type: data}, function () {

            })
        },
    }

;

chrome.runtime.onMessage.addListener(function (res, sender, sendResponse) {
    console.log('popup onMessage Listener', res);
    if (res && res.type === 'more_url') {
        let data = res.data;
        let user = data.user;
        let containerid = data.containerid;

        $('.name').html('<span class="to-album" data-alid="' + user.id + '">当前用户：' + user.screen_name + ' UID：' + user.id + '</span>');


        $('.album-list').html('<input type="button" class="wei-save" ' +
            'data-containerid="' + containerid + '"  ' +
            'data-uid="' + user.id + '" ' +
            'data-username="' + user.screen_name + '" ' +
            'value="保存">').show();

        $('.album-loading').hide();
        suc_show();
    } else if (res && res.type === 'user_list') {
        let list = res.data;
        let html = '';
        html += '<select class="album-select">';
        for (let i in list) {
            html += '<option value="' + list[i]['uid'] + '">' + list[i]['name'] + '</option>';
        }
        html += '</select>';
        $('.user-list').html(html);
        events.user_info({uid: list[0]['uid'], name: list[0]['name'], avatar: list[0]['']});
    } else if (res && res.type === 'wei_process') {
        let data = res.data;
        let total = data.total;
        let num = data.num;
        let tip = data.tip || '';
        let name = data.name;
        let avatar = data.avatar;
        if ($('.process #process' + name).length == 0) {
            $('.process').append('<li class="process-li" id="process' + name + '">');
        }
        let html = '';
        html += '<div class="album-info" ' +
            '><img class="process-pic" src="' + avatar + '"/>';
        html += '<span>' + name + '</span></div>';
        html += '<span class="pr">' + "（" + tip + "）" + num + ' / ' + total + '</span></li>';
        $('.process #process' + name).html(html)
    } else if (res && res.type === 'wei_fail') {
        $('.album-list').html(res.data).show();
        $('.album-loading').hide();
        err_hide();
    }
    sendResponse('done');
    return true
});

function err_hide() {
    $('.select-position').hide();
    $('.name').hide();
}

function suc_show() {
    $('.select-position').show();
    $('.name').show();
}
