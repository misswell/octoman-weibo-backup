function Trim(str, is_global) {
    var result;
    result = str.replace(/(^\s+)|(\s+$)/g, "");
    if (1 || is_global && is_global.toLowerCase() == "g") {
        result = result.replace(/\s/g, "");
    }
    return result;
}

function dateFormat(timestamp) {
    var date = new Date(timestamp);
    let Y = date.getFullYear() + '-';
    let M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
    let D = date.getDate() + ' ';
    let h = date.getHours() + ':';
    let m = date.getMinutes() + ':';
    let s = date.getSeconds();
    console.log(Y + M + D + h + m + s);
    return Y + M + D + h + m + s
}

// url参数解析
function getUrlParams(url) {
    var params = {};
    var urls = url.split("?");
    if (!urls[1]) {
        return {}
    }
    var arr = urls[1].split("&");
    for (var i = 0, l = arr.length; i < l; i++) {
        var a = arr[i].split("=");
        params[a[0]] = a[1];
    }
    return params;
}

function getParams(url){
    var params = {};
    var arr = url.split("&");
    for (var i = 0, l = arr.length; i < l; i++) {
        var a = arr[i].split("=");
        params[a[0]] = a[1];
    }
    return params;
}

function getUrlDomain(url) {
    var reg = /^http(s)?:\/\/(.*?)\//;
    var ToReplace = 'Host/';
    url.replace(reg, ToReplace);
    return reg.exec(url)[2]
}

function urlCheck(url) {
    return /^(http|https):\/\/.*?/.test(url)
}

function chromeCheck(url) {
    return /^(chrome):\/\/.*?/.test(url)
}


function config_get(key) {
    let value = localStorage.getItem(key) || null;
    return value;
}

function config_set(data) {
    console.log('set set', data);
    for (let i in data) {
        localStorage.setItem(i, data[i]);
    }
    return true;
}

function _pad(num, n = 2) {
    let len = num.toString().length;
    while (len < n) {
        num = "0" + num;
        len++;
    }
    return num;
}

function randomString(len) {
    len = len || 32;
    var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
    var maxPos = $chars.length;
    var pwd = '';
    for (i = 0; i < len; i++) {
        pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return pwd;
}

String.prototype.replaceAll = function (reallyDo, replaceWith, ignoreCase) {
    if (!RegExp.prototype.isPrototypeOf(reallyDo)) {
        return this.replace(new RegExp(reallyDo, (ignoreCase ? "gi" : "g")), replaceWith);
    } else {
        return this.replace(reallyDo, replaceWith);
    }
}
