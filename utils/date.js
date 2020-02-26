Date.prototype.format = function () {
    var s = '';
    var mouth = (this.getMonth() + 1) >= 10 ? (this.getMonth() + 1) : ('0' + (this.getMonth() + 1));
    var day = this.getDate() >= 10 ? this.getDate() : ('0' + this.getDate());
    s += this.getFullYear() + '-'; // 获取年份。
    s += mouth + "-"; // 获取月份。
    s += day; // 获取日。
    return (s); // 返回日期。
};


var date = {

    dateAdd: function (startDate, days) {
        startDate = new Date(startDate);
        startDate = +startDate + days * 1000 * 60 * 60 * 24;
        startDate = new Date(startDate);
        var nextStartDate = startDate.getFullYear() + "-" + util.formatNumber((startDate.getMonth() + 1)) + "-" + util.formatNumber(startDate.getDate());
        return nextStartDate;
    },

    theDate: function (num = 0) {
        var thisDate = new Date();
        var myDate = new Date(thisDate.getTime() + 24 * 60 * 60 * 1000 * num)
        var theDate = myDate.getFullYear() + '-' + util.formatNumber((myDate.getMonth() + 1)) + '-' + util.formatNumber(myDate.getDate())
        return theDate
    },

    thisDate: function (timestamp) {
        var now = timestamp ? new Date(timestamp) : new Date(),
            y = now.getFullYear(),
            m = now.getMonth() + 1,
            d = now.getDate();
        return y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d) + " " + now.toTimeString().substr(0, 8);
    },
    // 时间比较函数
    compareDate: function (startDate, endDate) {
        var arrStart = startDate.split("-");
        var startTime = new Date(arrStart[0], arrStart[1], arrStart[2]);
        var startTimes = startTime.getTime();
        var arrEnd = endDate.split("-");
        var endTime = new Date(arrEnd[0], arrEnd[1], arrEnd[2]);
        var endTimes = endTime.getTime();
        if (endTimes <= startTimes) {
            return false;
        }
        return true;
    },

    getHour: function () {
        var myDate = new Date();
        var theHour = myDate.getHours()
        return theHour
    },

    getDays: function (date1, date2) {
        var date1Str = date1.split("-"); //将日期字符串分隔为数组,数组元素分别为年.月.日
        //根据年 . 月 . 日的值创建Date对象
        var date1Obj = new Date(date1Str[0], (date1Str[1] - 1), date1Str[2]);
        var date2Str = date2.split("-");
        var date2Obj = new Date(date2Str[0], (date2Str[1] - 1), date2Str[2]);
        var t1 = date1Obj.getTime();
        var t2 = date2Obj.getTime();
        var dateTime = 1000 * 60 * 60 * 24; //每一天的毫秒数
        var minusDays = Math.floor(((t2 - t1) / dateTime)); //计算出两个日期的天数差
        var days = Math.abs(minusDays); //取绝对值
        return days;
    },

    getWeek: function (theDate) {
        var weekDay = ["周天", "周一", "周二", "周三", "周四", "周五", "周六"];
        var weekName = weekDay[new Date(Date.parse(theDate)).getDay()]
        return weekName
    },

    getDate: function (theDate) {
        var getDate = new Date(Date.parse(theDate)).getDate()
        return util.formatNumber(getDate)
    },

    getMonth: function (theDate) {
        var getMonth = new Date(Date.parse(theDate)).getMonth() + 1
        return util.formatNumber(getMonth)
    },

    getFullYear: function (theDate) {
        var getFullYear = new Date(Date.parse(theDate)).getFullYear()
        return getFullYear
    },

    diffDate: function (startDate, endDate) {
        console.log('调用了 diffDate 函数' + startDate + endDate)
        var startNewDate = new Date(startDate)
        var endNewDate = new Date(endDate)
        var startTime = startNewDate.getTime()
        var endTime = endNewDate.getTime()
        var diff = endTime - startTime
        var days = diff / (24 * 60 * 60)
        console.log(parseInt(days))
        return parseInt(days)
    },

    theTime: function (timestamp = 0) {
        if (timestamp) {
            var date = new Date(timestamp);
        } else {
            var date = new Date();
        }
        var year = date.getFullYear(); //获取当前年份
        var mon = date.getMonth() + 1; //获取当前月份
        var da = date.getDate(); //获取当前日
        var day = date.getDay(); //获取当前星期几
        var h = date.getHours(); //获取小时
        var m = date.getMinutes(); //获取分钟
        var s = date.getSeconds(); //获取秒

        var now = year + '-' + util.formatNumber(mon) + '-' + util.formatNumber(da) + ' ' + util.formatNumber(h) + ':' + util.formatNumber(m) + ':' + util.formatNumber(s);
        return now
    },


    prDates: function (begin, end) {
        var ab = begin.split("-");
        var ae = end.split("-");
        var db = new Date();
        db.setUTCFullYear(ab[0], ab[1] - 1, ab[2]);
        var de = new Date();
        de.setUTCFullYear(ae[0], ae[1] - 1, ae[2]);
        var unixDb = db.getTime();
        var unixDe = de.getTime();
        var prDates = []
        for (var k = unixDb; k <= unixDe;) {
            prDates.push((new Date(parseInt(k))).format());
            k = k + 24 * 60 * 60 * 1000;
        }
        return prDates
    },

    timestampToTime: function (timestamp) {
        var date = new Date(timestamp * 1000); //时间戳为10位需*1000，时间戳为13位的话不需乘1000
        var Y = date.getFullYear() + '-';
        var M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
        var D = util.formatNumber(date.getDate()) + ' ';
        var h = util.formatNumber(date.getHours()) + ':';
        var m = util.formatNumber(date.getMinutes());
        var s = ':' + date.getSeconds();
        return Y + M + D + h + m;
    }

}