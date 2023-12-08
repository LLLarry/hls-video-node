# 前端+Nodejs视频传输方案

一般来说，网页上展示的视频，都是由后端传递给前端的，那么，后台是如何来完成视频传输的这个操作的呢，我们这里以 `node` 后台为例，服务端框架选用 `express`

我们的目录如下：

- `node_modules：` 依赖包
- `service：` 处理前端请求
- `view：` 前端html界面文件
- `video：` 视频文件
- `index.js：` 入口文件

## 基础配置

1. **打开 入口文件 `index.js` ，写入以下代码：**

```js
const express = require('express')
const path = require('path')
const router = require('./service/video')

const app = express()

app.use(router);

app.use(express.static(path.resolve(__dirname, './view')))
app.use(express.static(path.resolve(__dirname, './video')))


app.listen(8000, () => {
    console.log(`服务器运行于：http://127.0.0.1:8000`);
})
```

1. **在 service 下新建一个文件 `video.js` ，内容如下：**

```js
const router = require('express').Router();
const fs = require('fs')
const path = require('path')


module.exports = router;
```

1. **在 view 下新建一个文件 `index.html`， 内容如下：**

```html
<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
        #video {
            width: 800px;
        }
    </style>
</head>

<body>
    <video id="video" src="/test.mp4" controls></video>
</body>

</html>
```

1. 随便找个视频文件放置到 `video` 文件夹内，这里以 `test.mp4` 为例

## 普通传递

### 静态引入

假如我们完成了基础配置，我们可以在项目的根目录下打开命令行终端，输入 `node index.js` 就会看到以下内容：

```bash
PS C:\Users\wangyue\Desktop\视频流> node .\index.js
服务器运行于：http://127.0.0.1:8000
```

此时，我们打开浏览器，在地址栏输入 `http://127.0.0.1:8000` ，就能看到我们的前端界面，并且能正常的播放视频

在基础配置中，video 的 src 写的是 `/test.mp4` ，这种方式就是直接以静态文件的形式引入

------

### 整体传递

1. 打开 service 文件夹内的 `video.js`，新增一条请求路由，内容如下：

```js
const router = require('express').Router();
const fs = require('fs')
const path = require('path')
// -------------------------
// 整体传递
router.get('/demo1', (req, res) => {

    let videoPath = path.resolve(__dirname, '../video/test.mp4')

    fs.readFile(videoPath, (err, data) => {
        if (err) throw err;

        res.send(data);
    })

})

// -------------------------
module.exports = router;
```

1. 修改 `index.html` 的 video 路径

```html
<video id="video" src="/demo1" controls></video>
```

重启服务器，刷新浏览器，你就会发现，视频传递成功了，并且能正常播放

**缺点：**

- 假如视频文件非常大，那么在网络带宽比较小的情况下，视频从后台传递到前端的速度会非常慢
- 前端需要接收完全部的视频数据，才可以播放

------

### Stream传输

我们可以借助 `fs` 的 `Stream` 来实现视频流式读取和流式传输

1. 打开 service 文件夹内的 `video.js`，新增一条请求路由，内容如下：

```js
const router = require('express').Router();
const fs = require('fs')
const path = require('path')
// -------------------------
// Stream 传输
router.get('/demo2', (req, res) => {

    let videoPath = path.resolve(__dirname, '../video/test.mp4')

    let readStream = fs.createReadStream(videoPath)

    readStream.pipe(res);

})

// -------------------------
module.exports = router;
```

1. 修改 `index.html` 的 video 路径

```html
html
复制代码<video id="video" src="/demo1" controls></video>
```

重启服务器，刷新浏览器，你就会发现，视频传递成功了，并且能正常播放

**缺点：**

- 无法点播

------

## 切片传递

切片传递，顾名思义，就是将原视频，切割为一个个小视频，浏览器端每次只请求其中的某一个小视频，而不必去把一个完整的视频给请求下来。

**优点：**

- 传输速度快
- 支持点播
- 可动态切换不同的分辨率
- 节省流量和网络带宽

**视频切片传递靠的是流媒体传输协议，常见的流媒体传输协议如下：**

1. rtp
2. rtcp
3. rtsp
4. rtmp
5. mms
6. flv
7. hls

本篇文章主要讲述如何使用 `hls` 协议来进行视频切片传输，其他协议也类似，感兴趣的可以自己去探索一下。

### hls概述

`hls (HTTP Live Streaming)` 是一种基于HTTP的流媒体网络传输协议；工作原理是把视频文件拆分为一段段短小、有序的小文件，浏览器端通过一个特殊的 `.m3u8` 索引文件来进行视频的请求，而每次只请求其中的某一个小文件，不需要请求一个完整的视频文件。

讲人话就是，把一个大视频，切割成一个个小视频，并用一个小本本把这一个个小视频的名称和顺序给记录下来，浏览器对照着这个小本本上列的记录来发送请求。

举个栗子：假设 `test.mp3` 的总时长为 `60s`，我们可以将它切割成 12个小视频，每个小视频的时长为 `5s`

```js
test.mp3 => [test1.mp3, test2.mp3, testn.mp3, ···, test12.mp3]
```

我们的小本本 `.m3u8` 内容为

```json
test1.mp3 00:01~05:00
test2.mp3 05:01~10:00
test3.mp3 10:01~15:00
···
test12.mp3 55:01~60:00
```

那么，浏览器就会根据你当前视频的播放进度，去 `.m3u8` 内寻找对应的小视频，然后将它请求下来，再塞到 `video` 标签内，这样就实现了视频的切片播放。一般情况下，浏览器会提前把下一段小视频也给请求下来。

------

### **切片工具**

首先，我们要先明确一个概念，`hls` 是传输协议，作用是帮你在网络中传输小视频。

至于你要怎么把一个大视频切割为n个小视频，这不是 `hls` 该干的事，你需要借助其它工具来实现。

我们可以利用 `FFmpeg` 来对我们的视频文件进行切片，`FFmpeg` 你可以理解为是一个软件，或者命令行工具，它的功能非常强大，可以帮助我们对视频进行各种各样的操作，例如视频压缩、转格式、提取图片、提取音频、打入水印等等。

当然，你不想用 `FFmpeg` 的话，你也可以去了解一下 `OpenCV`

- [FFmpeg官网](https://link.juejin.cn/?target=https%3A%2F%2Fffmpeg.org)
- [FFmpeg下载地址](https://link.juejin.cn/?target=https%3A%2F%2Fffmpeg.org%2Fdownload.html)
- [FFmpeg入门教程](https://link.juejin.cn/?target=https%3A%2F%2Fwww.ruanyifeng.com%2Fblog%2F2020%2F01%2Fffmpeg.html)

hls协议是将我们的视频，切割成一个个小视频，而这些小视频的格式后缀是 `.ts`

也就是说，假设我们的原视频是 `test.mp4` ，那么，我们需要先将它转格式为 `test.ts`，当然了，我们也可以一步到位，直接将 `mp4` 切割为 `ts` ，这个我们最后再说。

然后再对这个 `test.ts` 进行切割，切割的方式有2种，按**切片时长**切割和按**切片大小**切割

> 注意：下载好FFmpeg后，记得给它设置环境变量，设置环境变量的方式是：
>
> 1. 打开 `ffmpeg/bin` 文件夹
> 2. 在windows资源管理器地址栏上方复制bin目录的地址，我的是 `D:\ffmpeg\bin`
> 3. 单击 `我的电脑`，鼠标右键选择 `属性 -> 高级系统设置 -> 环境变量 ->`
> 4. 选择 `高级系统设置`
> 5. 选择 `环境变量`
> 6. 在 `用户变量` 或 `系统变量` 一栏中找到 `Path`，然后双击
> 7. 点击 `新建`
> 8. 粘贴我们FFmpeg的bin目录的路径，我的是 `D:\ffmpeg\bin`
> 9. 点击确定

------

### mp4转ts

打开你源视频所在的文件夹，按下 `shift + 鼠标右键`，选择 `在此处打开 powersheel`，紧接着在命令行终端中输入以下命令：

```powershell
ffmpeg -y -i test.mp4 -vcodec copy -acodec copy -vbsf h264_mp4toannexb test.ts
```

------

### 切割ts

将 `ts` 视频切割成一个个小视频，我们需要选择是以时长切割，还是以大小切割，并且，切割完成后，我们会得到一个 `.m3u8` 的索引文件

这里假设我们以时长进行切割，每个切片时长为10秒，索引文件名称为 `index.m3u8`，小视频文件名格式为 `test-n.ts`

打开你 `ts` 视频所在的文件夹，然后在当前文件夹下，新建一个 `chunk` 文件夹，用于存放视频切片和索引文件

接下来

打开你 `ts` 视频所在的文件夹，按下 `shift + 鼠标右键`，选择 `在此处打开 powersheel`，紧接着在命令行终端中输入以下命令：

```powershell
ffmpeg -i test.ts -c copy -map 0 -f segment -segment_list chunk/index.m3u8 -segment_time 10 chunk/test-%04d.ts
```

上面的命令执行完后，会将 `test.ts` 视频以10秒为基准进行切片，并生成索引文件，所有切片文件和索引文件都保存在 chunk 文件夹内

------

### 切片传输

经过上面的步骤，我们已经得到了切片和索引文件，但，我们该如何让前端能够完整的显示我们的视频文件呢？

如果我们想要播放 hls 协议视频，那么我们需要一个解析器，常用的解析器如下：

- [video.js](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fvideo.js)
- [hls.js](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fhls.js%2Fv%2Fcanary)

#### videojs方式

首先，打开我们的 `index.html` ，做出以下修改

```html
<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link href="https://cdn.bootcdn.net/ajax/libs/video.js/7.10.1/video-js.min.css" rel="stylesheet">
    <title>Document</title>
    <style>
        #video {
            width: 800px;
        }
    </style>
</head>

<body>
    <!-- vjs-big-play-centered 类名的作用是让我们的播放按钮居中 -->
    <video id="video" class="video-js vjs-default-skin vjs-big-play-centered" controls>
        <!-- 在source标签里写入我们的索引文件路径 -->
        <source src="/chunk/index.m3u8" type="application/x-mpegURL">
    </video>

	<script src="https://cdn.bootcdn.net/ajax/libs/video.js/7.10.1/video.min.js"></script>
    <script src="https://cdn.bootcdn.net/ajax/libs/video.js/7.10.1/lang/zh-CN.min.js"></script>

    <script>
        window.onload = () => {
            videojs('video', {
                language: 'zh-CN',
            });
        }
    </script>
</body>

</html>
```

> 注意：需要引入 video.js 以及 video.css，默认情况下 videojs的播放控件是英文，如果要替换成中文，还需要引入语言包，并设置language

完成上面的步骤后，我们可以发现，视频可以正常播放了，并且支持点播，同时，打开开发中控制面板查看 `network` 也可以看到，视频是按切片进行加载的，极大的提升了我们大视频的加载速度。

------

#### hlsjs方式

仍然是要修改我们的 `index.html`

```html
<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
        #video {
            width: 800px;
        }
    </style>
</head>

<body>
    <video id="video" controls></video>

    <script src="https://cdn.bootcdn.net/ajax/libs/hls.js/1.0.0-beta.3.0.canary.6685/hls.min.js"></script>

    <script>
        window.onload = () => {
            let video = document.getElementById('video')
            let videoSrc = '/chunk/index.m3u8';

            if (Hls.isSupported()) {
                var hls = new Hls();
                hls.loadSource(videoSrc);
                hls.attachMedia(video);
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = videoSrc;
            }
        }
    </script>
</body>

</html>
```

做好以上配置后，打开浏览器即可看到效果

我个人更喜欢用 hls.js

------

#### 其他

以上我是用原生写法进行演示，假如你是在 `vue` 、`react` 之类的框架中使用的话，方法也是类似的，我这里就不做演示了。

关于 `videojs` 和 `hlsjs` 用哪个看你自己的喜好来就行，本篇主要是讲视频流的应用，因此不会在这两个东西上做过多介绍，想了解的可以去百度

------

## 切片加密

有时候，我们想对我们的视频进行加密，或者说，对我们的分片视频进行加密，防止他人盗取我们的视频，那么我们可以选择为视频切片进行加密

过程为将一个mp4视频文件切割为多个ts片段，并在切割过程中对每一个片段使用 AES-128 加密，最后生成一个m3u8的视频索引文件

**前提：电脑操作系统必须安装有 `openssl` 这个工具 (Git的bash自带openssl)**

------

### 生成enc.key

在你 `MP4` 视频所在的文件夹下，打开 `Git bash` ，输入以下命令：

```bash
openssl rand 16 > enc.key
```

------

### 生成iv

在你 `MP4` 视频所在的文件夹下，打开 `Git bash` ，输入以下命令：

```bash
openssl rand -hex 16
```

> 执行上面的命令后，会得到一串字符，把它记下来，或者复制下来

------

### 新建enc.keyinfo

在你 `MP4` 视频所在的文件夹下，新建一个文件，文件名为：`enc.keyinfo` ，内容如下

```vbnet
http://127.0.0.1:8000/enc.key
C:\Users\wangyue\Desktop\视频流\video\enc.key
9a605f6be42059d689b40e13e39ff289
```

第一行是 `enc.key` 的网络访问路径

第二行是 `enc.key` 的本地绝对路径

第三行是我们第二步中得到的 `iv` 字符串

------

### 加密切片

在你 `MP4` 视频所在的文件夹下，打开命令行终端，输入以下命令：

```powershell
ffmpeg -y -i .\test.mp4 -hls_time 10 -hls_key_info_file .\enc.keyinfo -hls_playlist_type vod -hls_segment_filename "./chunk/test-%d.ts" ./chunk/index.m3u8
```

上面命令的意思是：

将当前目录下的 `test.mp4` 按`10秒`每段进行分片，使用当前文件夹下的 `enc.keyinfo` 进行加密，切片文件和索引文件均保存至 `chunk` 文件夹下

我们使用 `hlsjs` 方式进行传递到前端的时候，可以看到视频也是能正常显示的，但你单独的去打开我们的切片文件，会提示文件无法播放，这就实现了我们的视频切片加密

同时，打开浏览器开发者控制台，点击 `network` ，我们刷新一下网页

可以发现，浏览器先请求了 `index.m3u8` ，然后接着请求 `enc.key` ，最后才加载我们的视频切片

> 新人可能会疑惑，我们的切片既然加密了，那么我们在浏览器端怎么解密呢？
>
> 这个不需要你来操心，hlsjs或者videojs会根据你的 enc.key ，自动给你解密



### 其他

以上的加密，其实并不是很严谨，我们可以知道，当网页加载后，会通过 `xhr` 请求我们的 `enc.key`

我们仍可以去对这个请求进行限制，例如判断用户有没有登录，没有登录就不给它返回 `enc.key`

## 关于hls详情

### 1、`HLS`

`HLS`是一种基于`HTTP`的流媒体传输协议，可以实现流媒体的直播和点播，其工作原理就是把整个视频流分成一个个基于`HTTP`的文件，每次只下载一部分

`HLS`协议是由苹果提出的，它包括三个部分：

1. `HTTP`：传输协议
2. `m3u8`：索引文件
3. `ts`文件：音视频媒体信息

其中，`m3u8`是一种`UTF-8`编码的索引纯文本文件，它就像一个播放列表，记录了一段段的视频流ts文件

前端首先解析`m3u8`文件，然后通过`HTTP`请求分片内容即`ts`文件，然后再使用`MSE`的`appendBuffer`进行`buffer`的封装，完成合流的工作，最后交给播放器进行播放

### 2、实现

![img](https://blog-1302889287.cos.ap-nanjing.myqcloud.com/%E5%89%8D%E7%AB%AF%2BNodejs%E8%A7%86%E9%A2%91%E4%BC%A0%E8%BE%93%E6%96%B9%E6%A1%88/7d7d5603225e437695b223f06c4dcd9ctplv-k3u1fbpfcp-jj-mark3024000q75.png)

我们上传的通常是一个`mp4`格式的文件，那么就需要将其进行分片，而`FFmpeg`能够实现将`mp4`转换为`HLS`文件

`FFmpeg`是一个用于操作、转换流媒体的命令行工具

首先需要先安装`FFmpeg`，控制台执行：`ffmpeg` 不会报错即为安装成功

#### 2.1 后端

**第一步：先将`mp4`视频转化成一个ts文件**

```go
ffmpeg -y -i './video.mp4' -vcodec copy -acodec copy -bsf:v h264_mp4toannexb "./index.ts"
```

`-bsf:v h264_mp4toannexb`设置比特流过滤器

第二步：将改ts文件切成一段一段的小ts文件，并将各个`ts`文件信息存放到一个`m3u8`格式的文件

```go
ffmpeg -i "./index.ts" -c copy -map 0 -f segment -segment_list "./index.m3u8" 
-segment_time 10 "./index-%04d.ts"
```

此处将视频分成每10秒为一个`ts`文件

对于这种命令行的操作，通常是放到`node`的子进程中执行，即：

```lua
const { exec } = require('child_process')

exec(command, (error, stdout) => {
  if (error) {
    reject(error);
    return;
  }
  console.log(stdout);
});
```

用`Promise`封装一下：

```scss
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

await executeCommand('第一步')
await executeCommand('第二步')
```

![img](https://blog-1302889287.cos.ap-nanjing.myqcloud.com/%E5%89%8D%E7%AB%AF%2BNodejs%E8%A7%86%E9%A2%91%E4%BC%A0%E8%BE%93%E6%96%B9%E6%A1%88/fa5ae750614546edbabd02dfca97cfedtplv-k3u1fbpfcp-jj-mark3024000q75.png)

#### 2.2 前端

前端通过`HLS.js`库来处理`m3u8`格式文件，其基本使用如下：

```javascript
javascript复制代码import Hls from 'hls.js'

const video = document.getElementById('video') as HTMLVideoElement
const hls = new Hls()
hls.loadSource('./index.m3u8')
hls.attachMedia(video)
refPlyr.current!.plyr.media = video

hls.on(Hls.Events.MANIFEST_PARSED, () => {
  (refPlyr.current!.plyr as PlyrInstance).play()
})
```

![img](https://blog-1302889287.cos.ap-nanjing.myqcloud.com/%E5%89%8D%E7%AB%AF%2BNodejs%E8%A7%86%E9%A2%91%E4%BC%A0%E8%BE%93%E6%96%B9%E6%A1%88/e1a736d4aa3044f2844e2eab26e7bc53tplv-k3u1fbpfcp-jj-mark3024000q75.gif)



### 3、总结

实现流媒体的播放，主要有两步：

1. 后端利用`FFmpeg`工具将`mp4`转换成`m3u8`格式的文件
2. 前端通过`hls.js`逐段请求`ts`文件，并合成为视频流，交给播放器进行播放

比起传统的方式，流媒体传输可以实现视频的流畅播放，支持视频的点播、直播等；不仅如此，客户端还可以根据网络宽带 请求不同码率的视频文件（标准、高清、超清...）

