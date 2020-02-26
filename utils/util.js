var util = {
    formatTime: date => {
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        const hour = date.getHours()
        const minute = date.getMinutes()
        const second = date.getSeconds()

        return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
    },

    formatNumber: n => {
        n = n.toString()
        return n[1] ? n : '0' + n
    },

    obj2Query: function (params = new Object()) {
        console.log('obj2Query 方法')

        var arr = Object.keys(params)
        if (arr.length == 0) {
            return ''
        }

        var str = ''
        for (var i in params) {
            str = str + '&' + i + '=' + params[i]
        }
        return str
    },

    baseUrl: function (obj = {}, key = []) {
        if (typeof (obj) == 'object') {
            var i
            for (i in obj) {
                if (key.indexOf(i) != -1) {
                    if (obj[i]) {
                        obj[i] = config.BASE_URL + obj[i]
                    }
                }
            }
            return obj
        } else {
            if (obj) {
                return config.BASE_URL + obj
            } else {
                return obj
            }
        }

    },

    arrBaseUrl: function (obj = [], key = []) {
        var i
        var j
        for (i in obj) {
            for (j in obj[i]) {
                if (key.indexOf(j) != -1) {
                    if (obj[i][j] != '' && obj[i][j] != 'null' && obj[i][j] != null) {
                        obj[i][j] = config.BASE_URL + obj[i][j]
                    }
                }
            }
        }
        return obj
    },

    objLength: function (obj) {
        var count = 0;
        for (var i in obj) {
            count++;
        }
        return count;
    },

    filterHTMLTag: function (msg) {
        if (msg && msg != undefined) {
            msg = msg.replace(/<\/?[^>]*>/g, ''); //去除HTML Tag
            msg = msg.replace(/[|]*\n/, '') //去除行尾空格
            msg = msg.replace(/&npsp;/ig, ''); //去掉npsp
        }
        return msg;
    },
    //链接加随机数
    urlRand: function (obj = {}, key = [], time = '1') {
        var rand = parseInt(Date.parse(new Date()) / (1000 * time))
        if (typeof (obj) == 'object') {
            for (var i in obj) {
                if (key.indexOf(i) != -1 && obj[i] != '' && obj[i] != 'null' && obj[i] != null) {
                    console.log(obj[i])
                    obj[i] = obj[i] + '?r=' + rand
                    console.log(obj[i])
                }
            }
            return obj
        } else {
            if (obj != '') {
                return obj + '?r=' + rand
            } else {
                return obj
            }
        }
    },

    array_column: function (arr, value, key = '') {

        if (key == '') {
            var newArr = []
            for (var i in arr) {
                newArr.push(arr[i][value])
            }
        } else {
            var newArr = {}
            for (var i in arr) {
                newArr[arr[i][key]] = (arr[i][value])
            }
        }

        return newArr
    },

    prNum: function (num1, num2) {
        var count = num2 - num1
        var prNum = []
        for (var i = 0; i <= count; i++) {
            prNum.push(formatNumber(num1 + i))
        }
        return prNum
    },
    httpType: function (url) {
        if (/^http:\/\/.*/i.test(url)) {
            return 'http'
        } else if (/^https:\/\/.*/i.test(url)) {
            return 'https'
        } else {
            ''
        }
    }

}