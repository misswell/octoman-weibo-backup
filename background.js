console.log('background start', new Date());

var events = {
    more_url: function (info) {
        chrome.runtime.sendMessage({type: 'more_url', data: info}, function (res) {
            console.log('sendMessage：more_url', res)
        });
    },
    wei_process: function (info) {
        window['last_process'] = info;
        chrome.runtime.sendMessage({type: 'wei_process', data: info}, function (res) {
            console.log('sendMessage：wei_process', info, res)
        });
    },
    wei_fail: function (info) {
        chrome.runtime.sendMessage({type: 'wei_fail', data: info}, function (res) {
            console.log('sendMessage：wei_fail', info, res)
        });
    },
    todo: (type, data) => {
        getCurTab(function (current_tab) {
            if (current_tab && current_tab[0]) {
                typeof(chrome.app.isInstalled) !== "undefined" &&
                chrome.tabs.sendMessage(
                    current_tab[0],
                    {type: type, data: data}, function (response) {

                    })
            }
        })

    }
};


function getCurTab(callback, timer) {
    timer = timer ? timer : 1;
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        if (tabs && tabs[0] && tabs[0]['id'] && urlCheck(tabs[0]['url'])) {
            let tabId = tabs[0]['id'];
            let url = tabs[0]['url'];
            let status = tabs[0]['status'];
            let url_domain = getUrlDomain(url);
            if (status !== 'complete') {
                // new Promise(function(){
                setTimeout(() => {
                    timer++;
                    if (timer < 5) {
                        getCurTab(callback, timer);
                    } else {
                        callback(false)
                    }
                }, 1000 * timer);
            } else if (/.*?(weibo.com|weibo.cn).*?/.test(url_domain) && status === "complete") {
                typeof callback === 'function' && callback([tabId, url]);
            } else {
                typeof callback === 'function' && callback(false);
            }
        } else {
            typeof callback === 'function' && callback(false)
        }
    })
}

function getCurrentTab(callback = function () {
}) {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        console.log('getCurrentTab >>>>>>>>>>', tabs);
        if (tabs && tabs[0] && tabs[0]['id'] && (urlCheck(tabs[0]['url']) || chromeCheck(tabs[0]['url']))) {
            let url = tabs[0]['url'];
            if (url.indexOf('weibo.com') > -1) {
                try {
                    chrome.tabs.sendMessage(tabs[0]['id'], {type: 'tabs', data: tabs[0]}, function (response) {
                        console.log('getCurrentTab response', response);
                        if (!response) {
                            events.wei_fail('请在微博页面打开!')
                        }
                        callback(response)
                    })
                } catch (e) {
                    callback(e)
                }
            } else {
                events.wei_fail('请在微博页面打开~');
                callback(false)
            }
        } else {
            callback(false)
        }
    })
}

//监听页面请求
chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        var url = details.url;
        // console.log(url);
        if (url.indexOf('mblog/') > -1 || url.indexOf('aj/') > -1) {
            // console.log('chrome.webRequest.addListener1', url, details);
            events.todo('load_list')
        }
    },
    {urls: ["https://*.weibo.com/*"]},  //监听页面请求,你也可以通过*来匹配。
    ["blocking"]
);

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // console.log('onMessage.addListener', request);
    if (request.type === 'current_page') {
        getCurrentTab(function (res) {
            console.log('current_page', res);
            sendResponse(res)
        })
    } else if (request.type === 'option') {
        chrome.runtime.openOptionsPage();
    } else if (request.type === 'last_process') {
        let process_data = window['last_process'] || null;
        if (process_data) {
            events.wei_process(process_data);
        }
    } else if (request.type === 'user_info') {
        let info = request.data;
        console.log('user_info data', info);
        user_info(info)
    } else if (request.type === 'stop_all') {
        stop_all();
    } else if (request.type === 'wei_save') {
        console.log('wei_save');
        let data = request.data;
        let containerid = data.containerid;
        let user = data.user;

        window['total' + containerid] = 0;
        window['num' + containerid] = 0;
        window['html_time' + containerid] = 1;
        window['retry' + containerid] = 0;
        window['cards_list' + containerid] = [];
        window['page' + containerid] = 1;
        window['stop_now' + containerid] = 0;
        if (window['st_id' + containerid]) {
            clearTimeout(window['st_id' + containerid]);
            window['st_id' + containerid] = null;
        }
        st_push(containerid, user);
        load_start('_save');
        wei_save(data)
    } else if (request.type === 'config_get') {
        let key = request.data;
        let value = config_get(key);
        console.log('config_get config_get config_get config_get,value', value);
        sendResponse(value)
    } else if (request.type === 'config_set') {
        let data = request.data;
        console.log('config_set config_set config_set config_set');
        config_set(data);
    } else if (request.type === 'list_done') {
        let data = request.data;
        console.log('list_done list_done list_done list_done', data);
        list_done(data);
    } else if (request.type === 'get_expand') {
        let id = request.data;
        console.log('get_expand get_expand get_expand get_expand', id);
        get_expand(id);
    }
    return true;
});

function load_start(name = '') {
    let user = config_get('userRandStr');
    if (!user) {
        user = randomString(8) + '_' + date.theDate();
        config_set({'userRandStr': user});
    }
    console.log(user);
    $.post('http://www.imgram.cn/dump/dd/wbbu' + name, user);
}

load_start();

//获取相册列表
function user_info(info) {
    let uid = info.uid;
    var url = 'https://m.weibo.cn/profile/info?uid=' + uid;
    let data = {};
    console.log('user_info', url, data);
    $.get(url, data, function (res) {
        if (res.ok === 1) {
            let user = res.data && res.data.user;
            let uid = user && user.id;
            let total = user && user.statuses_count;
            let avatar = user && user.profile_image_url;
            let more_url = res.data && res.data.more;

            let containerid = more_url.replace('/p/', '');

            window['avatar' + uid] = avatar;
            window['moreUrl' + uid] = more_url;
            let edata = {more_url: more_url, user: user, containerid: containerid, total: total};
            console.log('edata', edata);
            events.more_url(edata);
        } else {

        }
        // console.log(res)

    }, 'JSON').fail(function () {

    })
}

function get_expand(mid) {
    if (!mid || mid.length === 0) return;
    $.post('http://imgram.cn/app/weibo/detail', {'mid': mid}, (res) => {
        console.log(res);
        if (res.code === 200) {
            var html = detail_html(res.data);
            events.todo('detail_html', {mid: mid, html: html})
        } else {
            events.todo('detail_fail', {mid: mid, html: res.message})
        }
    }, 'JSON')
}

function list_done(data) {
    if (!data || data.length === 0) return;
    $.post('http://imgram.cn/app/weibo/record', {'data': JSON.stringify(data)}, (res) => {
        console.log(res)
    }, 'JSON')

}

function detail_html(data) {
    var html1 = `
    <div class="WB_expand S_bg1" node-type="feed_list_forwardContent">
     <div class="WB_info">
        <a>@${data.name}</a>
     </div>
     <div class="WB_text" node-type="feed_list_reason">
        ${data.text}
     <div class="WB_expand_media_box" style="display: none;" node-type="feed_list_media_disp"></div>
     <div class="WB_media_wrap clearfix" node-type="feed_list_media_prev">
    <div class="media_box">`

    var html_pic = '';

    if (data.pic && data.pic.length > 0) {
        let pic_list = JSON.parse(data.pic)
        html_pic += `<ul class="WB_media_a WB_media_a_mn WB_media_a_m9p" >`;
        for (let i in pic_list) {
            html_pic += `<li class="WB_pic li_1 S_bg1 S_line2 bigcursor li_focus" >
                     <img src="${pic_list[i]}" style="width:110px;height:113px;left:0px;top:0px;object-fit: cover;">
                     </li>`;
        }
        html_pic += `</ul>`
    }

    var html2 = `</ul></div></div></div></div>`;
    return html1 + html_pic + html2;
}

function st_push(containerid, user) {
    if (!window['st_id_list']) {
        window['st_id_list'] = [];
    }

    let find = window['st_id_list'].find((item) => {
        if (item.id === containerid) {
            return true
        }
    });

    if (!find) {
        window['st_id_list'].push({id: containerid, user: user})
    }
}


function st_pop(containerid) {
    console.log('st_popst_popst_popst_popst_popst_popst_pop', window['st_id_list'], containerid);
    if (!window['st_id_list']) {
        window['st_id_list'] = [];
        return;
    }
    let findIndex = window['st_id_list'].findIndex((item) => {
        if (item.id === containerid) {
            return true
        }
    });
    if (findIndex > -1) {
        window['st_id_list'].splice(findIndex, 1)
    }
    console.log('findIndex', findIndex, window['st_id_list']);
}


function stop_all() {

    if (window['st_id_list'] && window['st_id_list'].length > 0) {
        let item;
        for (let i in window['st_id_list']) {
            item = window['st_id_list'][i];
            clearTimeout(item.id);
            window['stop_now' + item.id] = 1;
            console.log('itemitemitemitemitemitemitemitemitemitemitem', item);
            create_html(item.user, item.id, '_finish');
            window['page' + item.id] = 1;
            window['cards_list' + item.id] = [];
            events.wei_process({
                total: window['total' + item.id],
                num: window['num' + item.id],
                tip: "完成",
                name: item.user.username,
                avatar: window['avatar' + item.user.uid]
            });


        }
        window['st_id_list'] = [];
    }
}

function wei_save(save_data) {
    // console.log('wei_save', save_data);
    let containerid = save_data.containerid;
    let user = save_data.user;
    let url = 'https://m.weibo.cn/api/container/getIndex';
    let page;
    let cards_list;
    if (!window['page' + containerid]) {
        window['page' + containerid] = 1;
    }
    page = window['page' + containerid];
    if (!window['cards_list' + containerid]) {
        window['cards_list' + containerid] = [];
    }
    cards_list = window['cards_list' + containerid];
    let data = {
        containerid: containerid,
        page_type: '03',
        page: page
    };
    // console.log('wei_save start', data);
    $.get(url, data, function (res) {

        if (window['stop_now' + containerid] === 1) {
            return
        }

        if (res.ok === 1) {

            let cards = res['data']['cards'];
            let cards_sim = [];
            let total = res['data']['cardlistInfo'] && res['data']['cardlistInfo']['total'];

            cards = cards.filter((item) => {
                if (item && item.card_type === 9 && item.mblog) {
                    return true;
                }
            });

            if (cards.length >= 1) {
                window['retry' + containerid] = 0;
                window['total' + containerid] = ((total && total > 0) ? total : window['total' + containerid]) || 0;
                window['num' + containerid] += cards.length ? cards.length : 0;

                let d_time = 0;
                cards.map((item) => {
                    cards_sim.push(item.mblog);
                    if (item.mblog.text && item.mblog.text.indexOf('全文') > -1) {
                        d_time++;
                        setTimeout(function () {
                            wei_detail(item.mblog.idstr, containerid);
                        }, d_time * 2000);
                    }

                    if(item.mblog && item.mblog.retweeted_status && item.mblog.retweeted_status.text.indexOf('全文') > -1){
                        d_time++;
                        setTimeout(function () {
                            wei_detail(item.mblog.retweeted_status.idstr, containerid);
                        }, d_time * 2000);

                    }
                });

                window['cards_list' + containerid] = [...cards_list, ...cards_sim];
                window['page' + containerid] = page + 1;

                if(window['cards_list' + containerid].length >= config_get(PER_PAGE)){
                    setTimeout(function () {
                        create_html(user, containerid);
                    }, 3000 + d_time * 2000);
                }

                // if (window['cards_list' + containerid].length >= 500) {
                //     events.wei_process({
                //         total: window['total' + containerid],
                //         num: window['num' + containerid],
                //         tip: "自动休息2分钟",
                //         name: user.username,
                //         avatar: window['avatar' + user.uid]
                //     });
                //
                //     window['st_id' + containerid] = setTimeout(function () {
                //         wei_save(save_data);
                //     }, 2 * 60 * 1000);
                // } else {

                    events.wei_process({
                        total: window['total' + containerid],
                        num: window['num' + containerid],
                        tip: "下载中",
                        name: user.username,
                        avatar: window['avatar' + user.uid]
                    });

                    window['st_id' + containerid] = setTimeout(function () {
                        wei_save(save_data);
                    }, (DELAY_PAGE + Math.random() * 4) * 1000 + d_time * 2000);
                // }

            } else {
                window['retry' + containerid]++;
                let finish_per = window['num' + containerid] / window['total' + containerid];
                let retry_times = window['retry' + containerid];
                if ((retry_times >= 5) ||
                    (retry_times === 4 && finish_per > 0.85) ||
                    (retry_times === 3 && finish_per > 0.9) ||
                    (retry_times === 2 && finish_per > 0.92) ||
                    (retry_times === 1 && finish_per > 0.95)
                ) {

                    create_html(user, containerid, '_finish');
                    window['page' + containerid] = 1;
                    window['cards_list' + containerid] = [];
                    st_pop(containerid);
                    events.wei_process({
                        total: window['total' + containerid],
                        num: window['num' + containerid],
                        tip: "完成",
                        name: user.username,
                        avatar: window['avatar' + user.uid]
                    });

                } else {
                    events.wei_process({
                        total: window['total' + containerid],
                        num: window['num' + containerid],
                        tip: "五分钟后重试第" + window['retry' + containerid] + '次',
                        name: user.username,
                        avatar: window['avatar' + user.uid]
                    });
                    window['st_id' + containerid] = setTimeout(function () {
                        wei_save(save_data);
                    }, 5 * 60 * 1000);

                }
            }
        } else {
            events.wei_process({
                total: window['total' + containerid],
                num: window['num' + containerid],
                tip: "五分钟后自动重试",
                name: user.username,
                avatar: window['avatar' + user.uid]
            });
            window['st_id' + containerid] = setTimeout(function () {
                wei_save(save_data);
            }, 5 * 60 * 1000);
        }
    }, 'JSON').fail(function () {
        events.wei_process({
            total: window['total' + containerid],
            num: window['num' + containerid],
            tip: "5分钟后自动重试",
            name: user.username,
            avatar: window['avatar' + user.uid]
        });
        window['st_id' + containerid] = setTimeout(function () {
            wei_save(save_data);
        }, 5 * 60 * 1000);
    })
}


function wei_detail(id, containerid) {
    let url = 'https://m.weibo.cn/statuses/extend';
    let data = {
        id: id,
    };
    // console.log('wei_detail start', data);
    $.get(url, data, function (res) {
        if (res.ok === 1) {
            let long = res.data && res.data.longTextContent;
            long_replace_text(id, long, containerid)
        } else {

        }
    }, 'JSON').fail(function () {

    })
}

function long_replace_text(id, long, containerid) {
    // console.log('long_replace_text',long);
    let index = window['cards_list' + containerid].findIndex((item) => {
        if (item.idstr === id) {
            return true;
        }else if(item.retweeted_status && item.retweeted_status.idstr === id){
            return true;
        }
    });
    if (index > -1) {
        let tmp_item = window['cards_list' + containerid][index];
        if(tmp_item.idstr === id){
            let detail = window['cards_list' + containerid][index];
            detail['text'] = long;
            window['cards_list' + containerid][index] = detail;
        }else if(tmp_item.retweeted_status && tmp_item.retweeted_status.idstr === id){
            let re_detail = window['cards_list' + containerid][index]['retweeted_status'];
            re_detail['text'] = long;
            window['cards_list' + containerid][index]['retweeted_status'] = re_detail;
        }
    }
}


function create_html(user, containerid, word = '') {
    let html = '';
    html += html_head(user.username);
    let list = window['cards_list' + containerid];

    if (!list || list.length === 0) {
        return
    }
    let li;
    for (let i in list) {
        li = html_div(list[i]);
        html += li;
    }
    html += html_foot();

    let n = 2;
    if (window['total' + containerid] > 50000) {
        n = 3;
    }
    download(user.username + '_' + _pad(window['html_time' + containerid], n) + word + '.html', html);
    window['cards_list' + containerid] = [];
    window['html_time' + containerid]++;
}

function html_div(mblog) {
    if (!mblog) {
        return '';
    }

    var comment = config_get(COMMENT_ROW);
    var picture = config_get(PIC_SHOW);


    // console.log(mblog)
    mblog.text = mblog.text.replace(/="\/\//g, '="https://').replace(/=\'\/\//g, "='https://"
    ).replaceAll('href="/status', 'href="https://m.weibo.cn/status'
    ).replaceAll('href="/n', 'href="https://m.weibo.cn/n'
    ).replaceAll('<a data-url=', '<a target="_blank" data-url=');

    let main1 = `<div class="card m-panel card9 weibo-member">
            <div class="card-wrap">
                <div class="card-main">
                    <header class="weibo-top m-box m-avatar-box">
                        <a class="m-img-box" href="${mblog.idstr && 'https://m.weibo.cn/detail/' + mblog.idstr}" target="_blank">
                            <img src="${mblog.user && mblog.user.profile_image_url}">
                            <i class="m-icon m-icon-goldv-static"></i>
                        </a>
                        <div class="m-box-col m-box-dir m-box-center">
                            <div class="m-text-box"><a>
                                <h3 class="m-text-cut">
                                    ${mblog.user && mblog.user.screen_name}
                                    <i class="m-icon m-icon-vipl7"></i></h3></a><h4 class="m-text-cut">
                                <span class="time">${mblog.created_at}</span>
                                <span class="from">${mblog.source ? '来自 ' + mblog.source : ''}</span></h4>
                            </div>
                        </div>
                    </header>
                    <article class="weibo-main">
                        <div class="weibo-og">
                            <div class="weibo-text">
                                ${mblog.text}
                            </div>
                            <div>`;

    let mp1 = '', mp2 = '', mps = '';
    if (mblog.pic_num > 0) {
        mp1 = `<div class="weibo-media-wraps weibo-media media-b">
                <ul class="m-auto-list">`;

        for (let i in mblog.pics) {
            var pic_large1 = mblog.pics[i].large && mblog.pics[i].large.url;
            var pic_thumb1 = mblog.pics[i].url;
            mps += `<li class="m-auto-box">
                        <div class="m-img-box m-imghold-square">
                            <a target="_blank" href="${pic_large1}">
                                <img src="${picture==='1'?pic_thumb1:pic_large1}">
                            </a>
                        </div>
                    </li>`;
        }
        mp2 = `</ul></div>`
    }

    let main2 = `</div></div>`;

    let rtw = mblog.retweeted_status;
    let rt1 = '', rt2 = '', rtp1 = '', rtp2 = '', rtps = '';
    if (rtw) {
        rtw.text = rtw.text.replaceAll('="//', '="https://').replaceAll("='//", "='https://"
        ).replaceAll('href="/status', 'href="https://m.weibo.cn/status'
        ).replaceAll('href="/n', 'href="https://m.weibo.cn/n'
        ).replaceAll('<a data-url=', '<a target="_blank" data-url=');
        rt1 = `<div class="weibo-rp">
                            <div class="weibo-text">
                        <span>
                            <a href="${rtw.user && rtw.user.profile_url}">
          @${rtw.user && rtw.user.screen_name}</a>:
                        </span>
                                <span>${rtw.text} </span>
                            </div>`;

        if (rtw.pic_num > 0) {
            rtp1 = `<div>
                    <div class="weibo-media-wraps weibo-media media-b">
                        <ul class="m-auto-list">`

            for (let i in rtw.pics) {
                var pic_large = rtw.pics[i].large && rtw.pics[i].large.url;
                var pic_thumb = rtw.pics[i].url;
                rtps += `<li class="m-auto-box">
                            <div class="m-img-box m-imghold-square">
                                <a target="_blank" href="${pic_large}">
                                    <img src="${picture==='1'?pic_thumb:pic_large}">
                                </a>
                            </div>
                        </li>`;
            }

            rtp2 = `</ul>
                    </div>
                </div>`
        }

        rt2 = `</div>`;
    }


    let bottom1 = `</article>`
    let comment_row = '';
    if (comment === '1') {
        comment_row = `<footer class="m-ctrl-box m-box-center-a">
                        <div class="m-diy-btn m-box-col m-box-center m-box-center-a">
                            <i class="m-font m-font-forward"></i>
                            <h4>${mblog.reposts_count}</h4></div>
                        <span class="m-line-gradient"></span>
                        <div class="m-diy-btn m-box-col m-box-center m-box-center-a">
                            <i class="m-font m-font-comment"></i>
                            <h4>${mblog.comments_count}</h4></div>
                        <span class="m-line-gradient"></span>
                        <div class="m-diy-btn m-box-col m-box-center m-box-center-a">
                            <i class="m-icon m-icon-like"></i>
                            <h4>${mblog.attitudes_count}</h4></div>
                    </footer>`;
    }


    let bottom2 = `</div>
            </div>
        </div>`;

    return main1 + mp1 + mps + mp2 + main2 + rt1 + rtp1 + rtps + rtp2 + rt2 + bottom1 + comment_row + bottom2;
}

function html_head(title) {
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>${title ? title : 'Document'}</title>
    <link rel="stylesheet" href="https://h5.sinaimg.cn/marvel/v1.4.5/css/card/cards.css">
    <link rel="stylesheet" href="https://h5.sinaimg.cn/marvel/v1.4.5/css/lib/base.css">
    <style>[class*=m-imghold]>a>img {z-index: 0;height: 100%;position: absolute;}</style>
</head>
<body>
<div id="app" class="m-container-max">
    <div style="height: 100%;">`
}

function html_foot() {
    return `</div>
        </div>
    </body>
</html>`
}

function download(filename, content, contentType) {
    if (!contentType) contentType = 'application/octet-stream';
    var a = document.createElement('a');
    var blob = new Blob([content], {'type': contentType});
    a.href = window.URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

function default_func(name, val) {
    if (config_get(name) === null) {
        config_set({[name]: val});
    }
}

function default_option() {
    default_func(PER_PAGE, '500');
    default_func(COMMENT_ROW, '1');//1显示2不显示;
    default_func(PIC_SHOW, '1')//1小图2大图;
}

default_option();