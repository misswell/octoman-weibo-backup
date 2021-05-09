// auto run 
chrome.runtime.onMessage.addListener(function (res, sender, sendResponse) {
    // console.log('common onMessage Listener', res);
    if(res){
        if (res.type === 'tabs') {
            let url = res.data.url;
            let param = getUrlParams(url);
            let domain = getUrlDomain(url);
            // console.log('domain is', domain,'param is',param);
            wb_info();
        } else if(res.type === 'load_list'){
            // load_list()
        } else if(res.type === 'detail_html'){
            detail_html(res.data)
        }else if(res.type === 'detail_fail'){
            detail_fail(res.data)
        }
    }
    sendResponse('done');
    return true
});

var backMessage = function (type, callback) {
    if (typeof(type) === 'string') {
        typeof(chrome.app.isInstalled) !== "undefined" && chrome.runtime.sendMessage({type: type}, function (res) {
            typeof callback === 'function' && callback(res)
        });
    } else {
        typeof(chrome.app.isInstalled) !== "undefined" && chrome.runtime.sendMessage(type, function (res) {
            typeof callback === 'function' && callback(res)
        });
    }
};

var events = {
    tabs: function () {
        //获取当前页面链接
        chrome.runtime.sendMessage({type: 'tabs'}, function (tabs) {
            // console.log('sendMessage：tabs', tabs)
        });
    },
    album_fail:function(info){
        chrome.runtime.sendMessage({type: 'album_fail',data:info}, function (res) {
            // console.log('sendMessage：album_fail', res)
        });
    },
    user_list:function(list){
        //获取当前页面链接
        chrome.runtime.sendMessage({type: 'user_list',data:list}, function (res) {
            // console.log('sendMessage：user_list', res)
        });
    },
};

user_list = [];
function wb_info(){
    var all = $(".WB_face .face a");
    if(all){
        let list = [];
        let uid_temp;
        let name_temp;
        all.each(function(){
            name_temp = $(this).attr('title');
            var usercard = $(this).find('img').attr('usercard');
            var param = getParams(usercard);
            uid_temp = param['id'];
            var exist = list.findIndex(function(item){
                return item['uid'] === uid_temp;
            });
            if(exist === -1){
                list.push({uid:uid_temp,name:name_temp})
            }
        });
        if(list.length>0){
            events.user_list(list);
            // console.log('user_list',list);
            window.user_list = list
        }else{
            events.album_fail('当前页面找不到用户（请等页面加载完成）')
        }
    }else{
        events.album_fail('当前页面找不到用户（请等页面加载完成）')
    }
}
function detail_html(data){
    let mid = data.mid;
    let html = data.html;
    $('#empty'+mid).html(html);
}
function detail_fail(data){
    let mid = data.mid;
    let html = data.html;
    $('#empty'+mid).find('.empty_expand_word').html(html).removeClass('empty_expand_word');
}
function load_list(){
    // console.log('load_list');
    if(window['load_stid']){
        clearTimeout(window['load_stid']);
    }
    window['load_stid'] = setTimeout(()=>{
        var list = $('.WB_feed .WB_cardwrap');
        var list_format = [];
        list.each((index,item)=>{
            //正文
            var text = $.trim($(item).find('.WB_detail>.WB_text').html());
            text = text_format(text)
            if(text === "") return;

            var mid = $(item).attr('mid');
            var avatar = $(item).find('.WB_feed_detail>.WB_face img').attr('src');
            var name = $.trim($(item).find('.WB_detail>.WB_info a').html());
            var userhref = $(item).find('.WB_detail>.WB_info a').attr('href');
            var usercard = $(item).find('.WB_detail>.WB_info a').attr('usercard');
            var uatrack = $(item).find('.WB_detail>.WB_info a').attr('suda-uatrack');
            var uid = usercard2uid(usercard);


            //图片
            var pic = [];
            $(item).find('.WB_detail>.WB_media_wrap ul li.WB_pic').each((pi,it)=>{
                var img = $(it).find('img').attr('src');
                img && pic.push(img)
            });

            //视频封面
            var video = [];
            $(item).find('.WB_detail>.WB_media_wrap ul li.WB_video').each((pi,it)=>{
                var img = $(it).find('img').attr('src');
                img && video.push(img)
            });

            // 转发的引用部分
            var expand = $(item).find('.WB_detail>.WB_feed_expand');
            // console.log('expand', expand);
            var ex = {};
            if(expand){
                ex['text'] = $.trim($(expand).find('.WB_expand>.WB_text').html());
                ex['text'] = text_format(ex['text'])
                ex['empty']= $(expand).find('.WB_expand>.WB_empty');
                if(ex['empty']){
                    var em_word = `<span 
                        class="empty_expand_word eew" data-id="${mid}" 
                        style="position: absolute;right: 20px;bottom: 20px;cursor:pointer;">获取</span>`;
                    if($(ex['empty']).find('.eew').length === 0){
                        $(ex['empty']).append(em_word);
                        $(expand).attr('id','empty'+mid);
                    }
                }

                ex['name'] = $.trim($(expand).find('.WB_expand>.WB_info a').html());
                ex['userhref'] = $(expand).find('.WB_expand>.WB_info a').attr('href');
                ex['usercard'] = $(expand).find('.WB_expand>.WB_info a').attr('usercard');
                ex['uatrack'] = $(expand).find('.WB_expand>.WB_info a').attr('suda-uatrack');
                ex['mid'] = uatrack2mid(ex['uatrack']);
                ex['uid'] = usercard2uid(ex['usercard']);

                //图片
                ex['pic'] = [];
                $(expand).find('.WB_expand>.WB_media_wrap ul li.WB_pic').each((pi,it)=>{
                    var img = $(it).find('img').attr('src');
                    img && ex['pic'].push(img)
                });

                //视频封面
                ex['video'] = [];
                $(expand).find('.WB_expand>.WB_media_wrap ul li.WB_video').each((pi,it)=>{
                    var img = $(it).find('img').attr('src');
                    img && ex['video'].push(img)
                });
            }

            var sim = {
                text:text,
                mid:mid,
                uid:uid,
                name:name,
                avatar:avatar,
                pic:pic,
                userhref:userhref,
                usercard:usercard,
                uatrack:uatrack,
                video:video,
                ex:ex,
            };
            // console.log("sim", sim);
            // list_format.push(sim)
            ex['text'] && list_format.push(ex)
        });

        if(window['temp_list'] && JSON.stringify(window['temp_list']) === JSON.stringify(util.array_column(list_format,'mid'))){
            // console.log('none')
        }else{
            window['temp_list'] = util.array_column(list_format,'mid');
            // console.log("list", list_format);
            backMessage({type:'list_done',data:list_format});
        }
        window['load_stid'] = null;
    },3500)
};

function text_format(text){
    text = text.replace(/<a.*?>/g,'');
    text = text.replace(/<\/a>/g,'');
    text = text.replace(/action-type=\".*?\"/g,'');
    text = text.replace(/extra-data=\".*?\"/g,'');
    text = text.replace(/action-data=\".*?\"/g,'');
    text = text.replace(/usercard=\".*?\"/g,'');
    text = text.replace(/target=\".*?\"/g,'');
    text = text.replace(/alt=\".*?\"/g,'');
    text = text.replace(/rel=\".*?\"/g,'');
    text = text.replace(/render=\".*?\"/g,'');
    text = text.replace(/suda-uatrack=\".*?\"/g,'');
    text = text.replace(/suda-uatrack=\".*?\"/g,'');
    // text = text.replace(/\s+/g,' ');
    text = text.replace(/\s+/g,' ');
    text = text.replaceAll('&nbsp;','');
    return text
}

$(function(){
    $('body').on('click','.empty_expand_word',function(){

        var id = $(this).data('id')
        // console.log('empty_expand_word',id)
        backMessage({type:'get_expand',data:id})
    })
});

function uatrack2mid(uatrack){
    // "key=feed_headnick&value=transuser_nick:4478044376862849"
    // "key=feed_headnick&value=pubuser_nick:4478138559861754"
    var item = uatrack && uatrack.split(':');
    return item && item[1] || '';
}
function usercard2uid(usercard){
    // "id=5020907310&refer_flag=0000015010_"
    var item = usercard && usercard.split('&');
    var uid = '';
    if(!item) return uid;
    for(let i in item){
        var detail = item[i].split('=');
        if(detail[0] === 'id'){
            uid = detail[1];
        }
    }
    return uid;
}