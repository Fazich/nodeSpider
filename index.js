var request = require("request");
var cheerio = require("cheerio");
var eventproxy = require('eventproxy');
var moment = require("moment");
var options = {
    url: 'http://weibo.cn/rmrb?page=1',
    method: 'GET',
    charset: "utf-8",
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.93 Safari/537.36",
        "cookie": "_T_WM=c6e67dd3773085ebf63b81778381a2b1; SUB=_2A257rn6YDeRxGeRM4lER9i7KyzuIHXVZUQLQrDV6PUNbvtAKLWLTkW1LHeuOOYWKKvScGn4QcFkHdgMNIeKxzQ..; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WhLygbFuS9AymbY0nh4Sasg5JpX5KMt; SUHB=09PM_AcoqraCIt"

    }
};

/*时间处理*/
function timeDeal(data) {
    if (/今天/.test(data)) {
        var result = data.replace(/今天/, moment().format("YYYY-MM-DD")).substr(0, 16);
        return result;
    }else if (/分钟前/.test(data)) {
        var sub_time = parseInt(data.match(/^\d+/g));
        var time = new Date(new Date - 1000 * 60 * sub_time);
        var result = data.replace(data, moment(time).format("YYYY-MM-DD hh:mm"));
        return result;
    }else if (/月|日/) {
        var result = data.replace(/^\d*?月\d*日/g,moment().format("YYYY-MM-DD")).substr(0, 16);
        return result;
    }else{
        var result = data.substr(0,16);
        return result
    }
}


request(options,function(err, response, body){
    if(err){
        return;
    }


    var $ = cheerio.load(body);

    /*获取全部页面url*/
    //var pages = $("input[name='mp']").val();
    var pages = 2;
    var urls = [];
    for(var i=1;i<=pages;i++){
        urls.push("http://weibo.cn/rmrb?page="+i);
    }

    var eq = new eventproxy();
    eq.after('spiders',urls.length,function(spider){
        spider.map(function(url){
            var $ = cheerio.load(url);
            var data = [];
            $("div[class=c][id^=M_]").each(function(index,element){
                    data.push({
                        "attitude": $(element).find("[href^='http://weibo.cn/attitude']").last().text().replace(/[^\d]/g,""),
                        "repost":$(element).find("[href^='http://weibo.cn/repost']").last().text().replace(/[^\d]/g,""),
                        "comment":$(element).find("[href^='http://weibo.cn/comment']").last().text().replace(/[^\d]/g,""),
                        "time": timeDeal($(element).find("span[class='ct']").text())
                    });
            });
            console.log(data);

        });


    })

    /*并发访问所有url并返回body*/
    urls.forEach(function(url){
        var header = {
            url: url,
            method: 'GET',
            charset: "utf-8",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.93 Safari/537.36",
                "cookie": "_T_WM=c6e67dd3773085ebf63b81778381a2b1; SUB=_2A257rn6YDeRxGeRM4lER9i7KyzuIHXVZUQLQrDV6PUNbvtAKLWLTkW1LHeuOOYWKKvScGn4QcFkHdgMNIeKxzQ..; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WhLygbFuS9AymbY0nh4Sasg5JpX5KMt; SUHB=09PM_AcoqraCIt"

            }
        };
        request(header,function(err, response, body){
            if(err){
                throw new Error("错误");
            }
            if(response.statusCode == 200){
                eq.emit('spiders',body)
            }
        });

    })

    //$("div[class=c][id^=M_]").each(function(index,element){
    //    data.push({
    //        "attitude": $(element).find("[href^='http://weibo.cn/attitude']").last().text().replace(/[^\d]/g,""),
    //        "repost":$(element).find("[href^='http://weibo.cn/repost']").last().text().replace(/[^\d]/g,""),
    //        "comment":$(element).find("[href^='http://weibo.cn/comment']").last().text().replace(/[^\d]/g,""),
    //        "time": timeDeal($(element).find("span[class='ct']").text())
    //    });
    //});
    //console.log(data);
})

