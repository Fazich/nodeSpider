var request = require("request");
var cheerio = require("cheerio");
var async = require('async');
var moment = require("moment");
var fs = require('fs');
var xlsx = require('node-xlsx');



var startUrl = 'http://weibo.cn/tsgjs';
var name = "图书馆建设";

var options = {
    url: startUrl+'?page=1',
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
        urls.push(startUrl+"?page="+i);
    }


    /*并发访问所有url并限制并发数，返回body*/
    var count = 0;
  async.mapLimit(urls,2,function(url,callback){

        var header = {
            url: url,
            method: 'GET',
            charset: "utf-8",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.93 Safari/537.36",
                "cookie": "_T_WM=c6e67dd3773085ebf63b81778381a2b1; SUB=_2A257rwufDeRxGeRM4lER9i7KyzuIHXVZU5XXrDV6PUJbstAKLU3MkW1LHeuC5TFolTOJYNatYj_GwYme2gRqBA..; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WhLygbFuS9AymbY0nh4Sasg5JpX5o2p; SUHB=0rrKTR4AFVeYai; SSOLoginState=1454078927; gsid_CTandWM=4u3TCpOz56QRIpurQaELt9CwQ9N"

            }
        };
        request(header,function(err, response, body){
            if(err){
                throw new Error("错误");
            }
            if(response.statusCode == 200){
                var data = [];
                var $ = cheerio.load(body);
                $("div[class=c][id^=M_]").each(function(index,element){
                    data.push({
                        "attitude": $(element).find("[href^='http://weibo.cn/attitude']").last().text().replace(/[^\d]/g,""),
                        "repost":$(element).find("[href^='http://weibo.cn/repost']").last().text().replace(/[^\d]/g,""),
                        "comment":$(element).find("[href^='http://weibo.cn/comment']").last().text().replace(/[^\d]/g,""),
                        "time": timeDeal($(element).find("span[class='ct']").text())
                    });
                    //console.log(data);
                    var input = data[index].attitude+","+data[index].repost+","+data[index].comment+","+data[index].time+"\n";
                    fs.appendFileSync(name+'.csv', input);

                });
                count++;
                console.log("已完成："+100*count/pages+"%");
            }
            callback();
        });
    });
})

