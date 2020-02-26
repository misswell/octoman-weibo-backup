chrome.runtime.onMessage.addListener(function (res, sender, sendResponse) {
    console.log('common onMessage Listener', res);
    if (res && res.type === 'tabs') {
        let url = res.data.url;
        let param = getUrlParams(url);
        let domain = getUrlDomain(url);
        console.log('domain is', domain,'param is',param);
        wb_info();
    }
    sendResponse('done');
    return true
});

var events = {
    tabs: function () {
        //获取当前页面链接
        chrome.runtime.sendMessage({type: 'tabs'}, function (tabs) {
            console.log('sendMessage：tabs', tabs)
        });
    },
    album_get:function(list){
        //获取当前页面链接
        chrome.runtime.sendMessage({type: 'album_get',data:list}, function (res) {
            console.log('sendMessage：album_get', res)
        });
    },
    album_list:function(list){
        //获取当前页面链接
        chrome.runtime.sendMessage({type: 'album_list',data:list}, function (res) {
            console.log('sendMessage：album_list', res)
        });
    },
    album_fail:function(info){
        chrome.runtime.sendMessage({type: 'album_fail',data:info}, function (res) {
            console.log('sendMessage：album_fail', res)
        });
    },
    user_list:function(list){
        //获取当前页面链接
        chrome.runtime.sendMessage({type: 'user_list',data:list}, function (res) {
            console.log('sendMessage：user_list', res)
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
            events.album_get(list[0]);
            console.log('user_list',list);
            window.user_list = list
        }else{
            events.album_fail('当前页面找不到用户（请等页面加载完成）')
        }
    }else{
        events.album_fail('当前页面找不到用户（请等页面加载完成）')
    }
}
