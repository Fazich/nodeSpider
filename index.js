var request = require("request");
var cheerio = require("cheerio");
var async = require('async');
var moment = require("moment");
var fs = require('fs');




var startUrl = 'http://weibo.cn/shekebao';
var name = "社会科学报";
var cookies = " _T_WM=c6e67dd3773085ebf63b81778381a2b1; gsid_CTandWM=4uMv2ba21rkB8ho3hqv8e9CwQ9N; SUB=_2A257qZl7DeRxGeRM4lER9i7KyzuIHXVZVSczrDV6PUJbstAKLUr6kW1LHeuIAgfHZHYy22vhb76od0DHmdOwcg..; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WhLygbFuS9AymbY0nh4Sasg5JpX5o2p; SUHB=0ebcnsIKZFdqK-; SSOLoginState=1454237995";
fs.appendFileSync(name+'.csv', "粉丝,关注数,微博总数,内容,态度,转发,评论,时间"+"\n");

var options = {
    url: startUrl+'?page=1',
    method: 'GET',
    charset: "utf-8",
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.93 Safari/537.36",
        "cookie": cookies

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


/*并发访问所有url并限制并发数，返回body*/
var count = 0;
function fetchHtml(body,pages,url,callback){

    var data = [];
    var $ = cheerio.load(body);
    /*添加粉丝关注和微博数*/

    var fans = $("div[class=tip2]").find("a").eq(1).text().replace(/[^\d]/g,"");
    var follow = $("div[class=tip2]").find("a").eq(0).text().replace(/[^\d]/g,"");
    var total = $("div[class=tip2]").find("span[class=tc]").text().replace(/[^\d]/g,"")
    //console.log(total);
    $("div[class=c][id^=M_]").each(function(index,element){
        data.push({
            "fans": fans,
            "follow": follow,
            "total":total,
            "content":$(element).find("span[class='ctt']").text().replace(/,/g,"，"),
            "attitude": $(element).find("[href^='http://weibo.cn/attitude']").last().text().replace(/[^\d]/g,""),
            "repost":$(element).find("[href^='http://weibo.cn/repost']").last().text().replace(/[^\d]/g,""),
            "comment":$(element).find("[href^='http://weibo.cn/comment']").last().text().replace(/[^\d]/g,""),
            "time": timeDeal($(element).find("span[class='ct']").text())
        });

        var input = data[index].fans+","+data[index].follow+","+data[index].total+","+data[index].content+","+data[index].attitude+","+data[index].repost+","+data[index].comment+","+data[index].time+"\n";
        fs.appendFileSync(name+'.csv', input);


    });

    var delay = parseInt((Math.random()*(10-2+1)+2)*1000,10);

    setTimeout(function(){
        count++;
        console.log(name+"的微博正在爬取的是"+url+" 已完成："+(100*count/pages).toFixed(2)+"%  延迟:"+delay+"毫秒");
        callback();
    },delay);

    //console.log(name+"的微博爬取已完成："+(100*count/pages).toFixed(2)+"%  ");
    //callback();
}


request(options,function(err, response, body){
    if(err){
        return;
    }
    console.log(response.statusCode);

    var $ = cheerio.load(body);

    /*获取全部页面url*/
    var pages = $("input[name='mp']").val();
    //var pages = 1;
    var urls = [];
    for(var i=1;i<=pages;i++){
        urls.push(startUrl+"?page="+i);
    }



  async.mapLimit(urls,10,function(url,callback){

        var header = {
            url: url,
            method: 'GET',
            charset: "utf-8",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.93 Safari/537.36",
                "cookie": cookies

            }
        };
        request(header,function(err, response, body){
            if(err){
                console.log("重新爬取页面:"+url);
                var temp_header = {
                    url: url,
                    method: 'GET',
                    charset: "utf-8",
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.93 Safari/537.36",
                        "cookie": cookies

                    }
                };
                console.log(temp_header);
                request(temp_header,function(err, response, body){
                    if(err){
                        console.log(err);
                    }
                    if(response.statusCode==200){
                        fetchHtml(body,pages,url,callback);
                    }

                });

            }


            if(response.statusCode == 200){
               fetchHtml(body,pages,url,callback);
            }

        });
    });
})

