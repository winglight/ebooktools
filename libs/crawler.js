var Epub = require("epub-gen");

const kindlegen = require('kindlegen');
const fs = require('fs');
const request = require('request-promise');

const nodemailer = require('nodemailer')
const config = require('./config')
const Queue = require('./Queue')
const puppeteer = require('puppeteer');

const transporter = nodemailer.createTransport({
    host : config.smtp,
    secure: false,
    port: config.port,
    auth : {
        user : config.user,
        pass : config.pass
    }
})

var read = require('node-readability');
var iconv = require('iconv-lite');
const cheerio = require('cheerio');
const {URL} = require('url');

var cluster = require('set-clustering');
var stringSimilarity = require('string-similarity');

class Crawler {
    constructor() {
        String.prototype.endsWith = function (suffix) {
            return this.indexOf(suffix, this.length - suffix.length) !== -1;
        };

        Array.prototype.diff = function (a) {
            return this.filter(function (i) {
                return a.indexOf(i) < 0;
            });
        };

        Array.prototype.includes = function (searchElement, objkey) {
            'use strict';
            if (this == null) {
                throw new TypeError('Array.prototype.includes called on null or undefined');
            }

            var O = Object(this);
            var len = parseInt(O.length, 10) || 0;
            if (len === 0) {
                return false;
            }
            var k = 0;
            var currentElement;
            while (k < len) {
                currentElement = O[k];
                if (objkey) {
                    if (searchElement[objkey] === currentElement[objkey] ||
                        (searchElement[objkey] !== searchElement[objkey] && currentElement[objkey] !== currentElement[objkey])) { // NaN !== NaN
                        return true;
                    }
                } else {
                    if (searchElement === currentElement ||
                        (searchElement !== searchElement && currentElement !== currentElement)) { // NaN !== NaN
                        return true;
                    }
                }
                k++;
            }
            return false;
        };
    }

    async crawlTopic(url, callback) {
        var topic = {};
        topic.url = url;
        topic.output = config.output;

        console.log("topic url:" + url);
        callback(null, 'begin visit url');

                    this.topic = await this.getHrefsFromUrl(topic);
                    callback(null, 'got links: ' + this.topic.hrefs.length);

                    this.generateEpub(this.topic, callback);



    }


    filterLinks(links) {
        var c = cluster(links, function (x, y) {
            let sim = stringSimilarity.compareTwoStrings(x.url, y.url);
            // console.log('sim: ' + sim);

            return sim;
        });

        console.log('g0 length: ' + links.length);

        // var g = c.similarGroups(0.6);
        // console.log('g length: ' + g.length);
        //
        // if(!g || g.length == 0){
            var g = c.groups(3);
            console.log('g2: ' + JSON.stringify(g));
        // }
        if(!g){
            return links;
        }
        let index = g.map(function(a){return a.length;}).indexOf(Math.max.apply(Math, g.map(function(a){return a.length;})));
        console.log('g3 index: ' + index);

        return g[index].sort(function (a,b)
        {
            return a.index - b.index;
        });
    }

    parseLink(base, link, exludeOutSite) {
        var res = new URL(link, base);
        if (exludeOutSite && link.indexOf("http") == 0) {
            var baseDomain = new URL(base).host;
            if (res.host !== baseDomain) {
                return "";
            }
        }
        return res.href;
    }

    async pushMobi(path) {

        // verify connection configuration
        // transporter.verify(function(error, success) {
        //     if (error) {
        //         console.log(error);
        //     } else {
        //         console.log('Server is ready to take our messages');
        //     }
        // });


        console.log("pushMobi begin");
        try{
            transporter.sendMail({
                from: 'noreply  <' + config.user + '>',
                to: config.kindle,
                subject: 'Convert',
                text: 'Pushing to kindle from ' + path,
                attachments: [{
                    path,
                    encoding: 'base64',
                    contentType: 'application/x-mobipocket-ebook'
                }]
            }, (err, info) => {
                if (err) console.log("sendMail error:" + err);
                else console.log("sendMail completed: " + JSON.stringify(info));
            });

        } catch (e) {
            console.log("pushMobi error:" + e);
        }
    }

    async generateEpub(topic, callback) {
    //generate e-book
    var metadata = {
        id: Date.now(),
        title: topic.name,
        cover: topic.cover || '',
        series: '',
        sequence: 1,
        author: 'Anonymous',
        fileAs: 'Anonymous',
        genre: 'Default',
        tags: '',
        copyright: 'Anonymous, 2018',
        publisher: '',
        published: '',
        lang: 'zh',
        language: 'zh',
        description: '',
        contents: 'Chapters',
        source: topic.url,
        content: []
    };

        const queue = new Queue(this.getChapter, 35);
        topic.hrefs.forEach((link, i) => {
            queue.add([this.parseLink(topic.url, link.url), link.title, i]);
        });

        queue.run().then(
            (data) => {
                data.forEach((chapter) => {
                    if (chapter && ( chapter instanceof Object) && chapter.title !== 'NA') {
                        metadata.content.push(chapter);
                    }
                });
                metadata.content.sort(function (a,b)
                {
                    return a.index - b.index;
                });

                new Epub(metadata, topic.output + topic.name + '.epub').promise.then(function(){
                    callback(null, "Ebook Generated Successfully!");
                    console.log("Ebook Generated Successfully!");

                    kindlegen(fs.readFileSync(topic.output + topic.name + '.epub'), (error, mobi) => {
                        // mobi is an instance of Buffer with the compiled mobi file
                        if(error){
                            console.log("kindlegen error:" + error);
                            callback("kindlegen error:" + error);
                        }else {
                            // mobi is an instance of Buffer with the compiled mobi file
                            fs.writeFileSync(topic.output + topic.name + '.mobi', mobi,  "binary",function(err) {
                                callback("writeFileSync error:" + err);
                                console.log("writeFileSync error:" + err);
                            });


                            // if(isPush) {
                            //     that.pushMobi(config.output);
                            // }

                            callback(null, 'success');
                        }
                    });
                }, function(err){
                    console.error("Failed to generate Ebook because of ", err)
                });
            },
            (e) => {
                callback("queue.run: " + e);
            }
        );

    }

    getChapter(url, title, index){
        return new Promise((resolve, reject) => {
                try {

                    console.log("crawl chapter url: " + url);

                    read(url, {strictSSL: false}, function (err, article, meta) {
                        if (!err) {
                            let chapter = {};

                            chapter.title = this.title;
                            chapter.index = this.index;

                            chapter.data = article.content;
                            console.log("chapter.title:" + chapter.title);

                            // metadata.content.splice(this.index, 1, chapter);

                            console.log("epub.addSection i:" + this.index);

                            // Close article to clean up jsdom and prevent leaks
                            article.close();

                            resolve(chapter);

                        } else {
                            console.log("read chapter error: " + err);
                            resolve("read chapter error:" + err);
                        }

                    }.bind({index: index, title: title}));

                } catch (ef) {
                    console.log("crawl chapter error:" + ef);
                    resolve("crawl chapter error:" + ef);
                }
        });
    }

    async getHrefsFromUrl(topic) {
        let browser;
        try {

            browser = await puppeteer.launch({ignoreHTTPSErrors: true, headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--lang=zh']});

            const page = await browser.newPage();
            await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36");

            page.on('error', msg => {
                console.log('page error: ' + msg);
            });

            await page.goto(topic.url, {timeout: 0});

            topic.name = this.escapeChars(await page.title());

            // execute standard javascript in the context of the page.
            const hrefs = await page.evaluate(() => {
                const anchors = document.querySelectorAll('a');
                return [].map.call(anchors, (a, i) => eval({"index": i, "url": a.getAttribute('href'), "title": a.text.replace('\\', '').replace('/','')}));
            });
            console.log("hrefs length: " + hrefs.length);

            //common crawler tasks
            var links = [];
            hrefs.forEach(function (href) {
                var link = href.url;
                // console.log("topic href:" + link);
                if (link && link.indexOf('javascript') != 0 && link.indexOf('#') < 0 && href.title.length > 4) {
                   links.push(href);
                }
            });
            console.log("getHrefsFromUrl links length:" + links.length);

            topic.hrefs = this.filterLinks(links);

            return topic;
        } catch (e) {
            console.log("getHrefsFromUrl error:" + e);
        }finally {
            browser.close();
        }
    };

    parsePage(data ) {
        const $ = cheerio.load(data);
        let output = [];
        $( "a" ).each( (i, elem ) => {
            let datum = {
                index: i,
                title: $(elem).text().replace('\\', '').replace('/',''),
                url: $(elem).attr( 'href' )
            };
            if(datum.url && datum.url.indexOf('javascript') != 0 && datum.url.indexOf('#') != 0 && datum.title.length > 0) {
                output.push(datum);
            }
        });
        return output;
    };

    escapeChars(title ) {
        if(!title) return new Date().getTime();
        if(title.substring(title.length-1) === '/') title = title.substring(0, title.length-1);
        let index = title.indexOf('/');
        if(index >=0){
            title = title.substring(index+1);
            index = title.indexOf('/');
            if(index >=0){
                title = this.escapeChars(title);
            }
        }
        return title;
    };

}

const crawler = new Crawler();

module.exports = crawler;

// console.log("-------begin--------");
// crawler.pushMobi('/Users/chenyu/Downloads/Xiao Shuo Ke I_Zhe Mo Du Zhe De Mi Mi - Unknown.mobi');

// const CREDS = require('./creds');
// const user_selector = '#username';
// const pass_selector = '#password';
// const btn_selector = '#computer_code > div > div.login_form > form > ul > li.btns > button';