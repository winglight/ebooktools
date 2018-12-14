var crawler = require('../libs/crawler');

module.exports = app => {
  /**
   * @api {get} / API Status
   * @apiGroup Status
   * @apiSuccess {String} status API Status' message
   * @apiSuccessExample {json} Success
   *    HTTP/1.1 200 OK
   *    {"status": "NTask API"}
   */
  app.get("/", (req, res) => {
        var url = req.query.url;

        crawler.crawlTopic(url, function (err, msg) {
            if(err){
                res.write(err + '\n');
                console.log('failed end');
                res.end();
            }else if(msg.indexOf('success') >= 0) {
                res.write(msg + '\n');
                console.log('success end');
                res.end();
            }else {
                console.log('new message:' + msg);
                res.write(msg + '\n');
            }
        })
  });
};
