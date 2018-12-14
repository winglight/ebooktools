
module.exports = app => {
  app.listen(app.get("port"), () => {
          console.log(`Ebook Tools API - Port ${app.get("port")}`);
        });
};
