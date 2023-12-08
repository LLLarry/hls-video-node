const router = require("express").Router();
const fs = require("fs");
const path = require("path");
// 整体传递
router.get("/demo1", (req, res) => {
  let videoPath = path.resolve(__dirname, "../video/test.mp4");

  fs.readFile(videoPath, (err, data) => {
    if (err) throw err;

    res.send(data);
  });
});

// Stream 传输
router.get("/demo2", (req, res) => {
  let videoPath = path.resolve(__dirname, "../video/test.mp4");

  let readStream = fs.createReadStream(videoPath);

  readStream.pipe(res);
});

module.exports = router;
