# EasyPlayer.js

## 简介

集播放http-flv, hls, websocket 于一身的H5`视频直播/视频点播`播放器, 使用简单, 功能强大；

## 功能说明

- [x] 支持 MP4 播放

- [x] 支持 m3u8/HLS 播放;

- [x] 支持 HTTP-FLV/WS-FLV 播放;

- [x] 支持直播和点播播放;

- [x] 支持播放器快照截图;

- [x] 支持点播多清晰度播放;

- [x] 支持全屏或比例显示;

- [x] 自动检测 IE 浏览器兼容播放;

- [x] 支持重连播放；

## HTML 集成示例

- 使用方式

- [x] 普通集成

copy dist/element/EasyPlayer-element.min.js 到 www 根目录

在 html 中引用 dist/element/EasyPlayer-element.min.js

```html
<!DOCTYPE html>
<html>
<head>
  <title>easyplayer</title>
  <meta charset="utf-8"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"/>
  <meta
    content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"
    name="viewport"
  />
  <script type="text/javascript" src="EasyPlayer-element.min.js"></script>
</head>
<body>
<easy-player
  video-url="rtmp://live.hkstv.hk.lxdns.com/live/hks2"
  live="true"
  stretch="true"
></easy-player>
<easy-player
  video-url="http://live.hkstv.hk.lxdns.com/live/hks/playlist.m3u8"
  live="false"
  stretch="true"
></easy-player>
<easy-player
  video-url="http://live.hkstv.hk.lxdns.com/flv/hks.flv"
  live="true"
  stretch="true"
></easy-player>
</body>
</html>
```

- [x] vue集成

```
  npm install @easydarwin/easyplayer --save
```

- Vue 集成调用

copy node_modules/@easydarwin/easyplayer/dist/component/crossdomain.xml 到 静态文件 根目录

copy node_modules/@easydarwin/easyplayer/dist/component/EasyPlayer-lib.min.js 到 静态文件 根目录

**注意：** 没有调用会出现无法加载对应插件的报错

在 html 中引用 dist/component/EasyPlayer-lib.min.js

### H.265

copy node_modules/@easydarwin/easyplayer/dist/component/EasyPlayer.wasm 到 静态文件 根目录

#### demo

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <link rel="icon" href="<%= BASE_URL %>favicon.ico"/>
  <title>EasyPlayer-demo</title>
  <script src="https://cdn.staticfile.org/jquery/1.10.2/jquery.min.js"></script>
  <script src="./EasyPlayer-lib.min.js"></script>
</head>
<body>
<noscript>
  <strong
  >We're sorry but easynvr-token doesn't work properly without JavaScript
    enabled. Please enable it to continue.</strong
  >
</noscript>
<div id="app"></div>
<!-- built files will be auto injected -->
</body>
</html>

更多使用demo 详情见 node_modules/@easydarwin/easyplayer/dist/element/index.html
```

## 效果演示

![](http://www.easydarwin.org/github/images/easyplayer/easyplayer.js/easyplayer.js.20190923.png)

- [x] npm集成

```html
......

<easy-player
  live
  muted
  autoplay
  :video-url="camera.videoSrc"
  style="width: 100%;height: 200px"
  @error="restartPlayer"
/>

...... ...... import EasyPlayer from '@easydarwin/easyplayer'; ......
components: { EasyPlayer }
```

## 配置属性

| 参数               | 说明                                             | 类型                       | 默认值 |
| ------------------ | ------------------------------------------------ | -------------------------- | ------ |
| alt                | 视频流地址没有指定情况下, 视频所在区域显示的文字       | String                     | 无信号 |
| aspect             | 视频显示区域的宽高比                                | String                     | 16:9   |
| autoplay           | 自动播放                                           | Boolean                    | true   |
| currentTime        | 设置当前播放时间                                     | Number                    | 0   |
| decode-type        | 解码类型 仅支持flv (soft: 强制使用wasm模式）                                      | String                    | auto   |
| easyStretch        | 是否不同分辨率强制铺满窗口                            | Boolean                    | false  |
| live               | 是否直播, 标识要不要显示进度条                        | Boolean                    | true   |
| loop               | 是否轮播。                                          |Boolean                | false  |
| muted              | 是否静音                                         | Boolean                    | true  |
| poster             | 视频封面图片                                     | String                     | -      |
| reconnection       | 视频出错时自动重连                                | Boolean                     | false  |
| resolution         | 仅支持hls流; 供选择的清晰度 fhd:超清，hd:高清，sd:标清      | String | "yh,fhd,hd,sd"   |
| resolutionDefault  | 仅支持hls流                                    | String | "hd"   |
| video-url | 视频地址 | String | - |
| has-audio | 是否渲染音频（音频有问题,请设置成false）仅支持flv，当设置为false时不会再解码音频 | Boolean | true |
| video-title | 视频右上角显示的标题 | String | - |
| recordMaxFileSize | 录像文件大小(MB) | Number | 200 |

## 事件回调

| 方法名      | 说明         | 参数                  |
| ---------- | ------------ | ---------------------|
| play       | 播放事件      |                      |
| pause      | 暂时事件      |                      |
| error      | 播放异常      |                      |
| ended      | 播放结束或直播断流    |               |
| timeupdate | 当前播放时间回调|  currentTime             |

## Vue方法
    通过获取组件ref，进行调用api。例this.$refs.easyPlayer.initPlayer();
| 方法名      | 说明         | 参数                  |    描述   |
| ---------- | ------------ | ---------------------|----------|
| initPlayer         | 初始化播放器      |                     |
| destroyPlayer      | 销毁播放器    |               |
| switchVideo      | 播放开关    |               |
| switchAudio      | 静音开关    |               |
| fullscreen      | 全屏    |               |
| exitFullscreen      | 退出全屏    |               |
| changeStretch      | 视频拉伸模式    |               |
| snapshot      | 保存快照    |               |
| switchRecording      | 录像开关    |               |第一次调用时为开始录像，第二次为结束录像，两次间隔需在三秒以上，不支持MP4流录像|

## 常见问题

FLV :

    1、flv协议播放需视频流有音频，无音频需增加has-audio:false，否则无法进行播放
    2、flv流在ios播放通过wasm转码，会造成音频解码失败，无法播放音频，在ios使用easyPlayer建议使用hls协议

HLS :

    1、hls流为h.265格式时，播放器拉流正常，但是播放器黑屏问题：此问题是因为在hls流前几次生成的ts文件时，ts文件为空，easyPlayer无法识别流是h.264还是h.265，
    从而没有进行wasm软解码，造成黑屏，正常这种在第二次拉流时正常播放
    解决方案：
        在内核服务端检测m3u8文件是否为空，为空则返回状态码为404，从而播放器会继续拉流，从而正常播放器
        使用两个播放器，一个进行拉流，当拉流成功时使用第二个播放器去覆盖第一个拉流播放器，并销毁第一个播放器

MP4 :

    1、MP4流不支持视频录像

## 更多流媒体音视频资源

EasyDarwin开源流媒体服务器：<a href="http://www.easydarwin.org" target="_blank" title="EasyDarwin开源流媒体服务器">www.EasyDarwin.org</a>

EasyDSS高性能互联网直播服务：<a href="http://www.easydss.com" target="_blank" title="EasyDSS高性能互联网直播服务">www.EasyDSS.com</a>

EasyNVR安防视频可视化服务：<a href="http://www.easynvr.com" target="_blank" title="EasyNVR安防视频可视化服务">www.EasyNVR.com</a>

EasyNVS视频综合管理平台：<a href="http://www.easynvs.com" target="_blank" title="EasyNVS视频综合管理平台">www.EasyNVS.com</a>

EasyNTS云组网：<a href="http://www.easynts.com" target="_blank" title="EasyNTS云组网">www.EasyNTS.com</a>

EasyGBS国标GB/T28181服务器：<a href="http://www.easygbs.com" target="_blank" title="EasyGBS国标GB/T28181视频服务器">www.EasyGBS.com<
/a>

EasyRTS应急指挥平台：<a href="http://www.easyrts.com" target="_blank" title="EasyRTS应急指挥平台">www.EasyRTS.com</a>

TSINGSEE青犀开放平台：<a href="http://open.tsingsee.com" target="_blank" title="TSINGSEE青犀开放平台">open.TSINGSEE.com</a>

Copyright © <a href="http://www.tsingsee.com" target="_blank" title="青犀TSINGSEE">www.TSINGSEE.com</a> Team 2012-2021

## 开放平台

EasyPlayer群1：544917793(已满)</br>
EasyPlayer群2：161592199</br>
EasyRTMP: 58725484

![青犀TSINGSEE](http://www.easydarwin.org/public/images/tsingsee_qrcode_160.jpg)

