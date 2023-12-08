const express = require("express");
const path = require("path");
const router = require("./service/video");
const app = express();

app.use(router);

app.use(express.static(path.resolve(__dirname, "./views")));
app.use(express.static(path.resolve(__dirname, "./video")));

app.listen(8000, () => {
  console.log(`服务器运行于：http://127.0.0.1:8000`);
});
