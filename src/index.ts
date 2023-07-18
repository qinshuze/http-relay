import {createServer} from "node:http";
import minimist from "minimist";
import {config} from "dotenv";
import Router from "./http/Router";
import logger from "./utils/logger";
import {enc, HmacSHA512} from "crypto-js";
import MsgPushRequest from "./utils/request/msg";
import Client from "./rpc/websocket/Client";
import HttpRelay from "./http/controller/HttpRelay";

config()

// 获取服务端口号
const args = minimist(process.argv.slice(2));
const port = args.port || 8005

// 创建http服务器
const router = new Router()
const httpServer = createServer((req, res) => router.run(req, res))
httpServer.listen(port)

httpServer.on("clientError", (err, socket) => {
  // @ts-ignore
  logger.error(`HTTP/1.1 HttpRelay - ${err.code} ${err.message}`)
  // // @ts-ignore
  // if (err.code === 'ECONNRESET' || !socket.writable) {
  //     return;
  // }

  // @ts-ignore
  socket.end(`HTTP/1.1 400 HttpRelay - Bad Request\r\n\r\n`)
})

// 拦截设置
router.interceptor((req, res, next, options) => {
  // 跨域设置
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Request-Method", "GET,POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,Token")
  res.setHeader("Access-Control-Expose-Headers", "*")

  if (req.method === "OPTIONS") {
    res.end()
    return;
  }

  // 设置缓存策略
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Content-Type", "text/plain")

  const exist = router.checkRouteIsExist(options.urlParsedQuery.pathname || "", req)
  if (!exist) {
    res.statusCode = 404
    res.statusMessage = "HttpRelay - Route Not Found"
    res.end()
    return;
  }

  // 请求超时设置，主要用于解决由于客户端网络断开后无法及时通知服务器，导致请求一直无法释放
  req.setTimeout(60000, () => {
    logger.warn("由于客户端请求长时间未发送消息，服务器已关闭当前请求")
    req.destroy()
  })

  // 响应超时设置
  res.setTimeout(30000, () => {
    if (res.writableEnded || res.closed) return;
    res.statusCode = 408
    res.statusMessage = "HttpRelay - Request Timeout"
    res.end()
  })

  // 记录日志
  res.on("finish", () => {
    const code = String(res.statusCode).substring(0, 1)
    const successCodes = ["1", "2", "3"]

    if (successCodes.includes(code)) return;

    if (res.statusCode === 500) {
      return logger.error(`${req.method} ${res.statusCode} ${req.url} - ${res.statusMessage}`)
    } else {
      return logger.warn(`${req.method} ${res.statusCode} ${req.url} - ${res.statusMessage}`)
    }
  })

  next()
})

const accessKey:string = process.env.ACCESS_KEY || ""
const secret:string = process.env.ACCESS_SECRET || ""

async function getAuthToken() {
  const params = new URLSearchParams({
    access_key: accessKey,
    timestamp: parseInt(String(new Date().getTime() / 1000)) + "",
  })

  params.sort()
  const url = `${new URL(process.env.MSG_PUSH_API_URL||"").host}/token`
  const signStr = `GET ${url}?${params.toString()}`
  const hash = HmacSHA512(signStr, secret)
  const signature = Buffer.from(enc.Base64.stringify(hash)).toString("base64")
  params.set("signature", signature)
  return MsgPushRequest.get<{ token: string }>(`http://${url}?${params.toString()}`)
}

getAuthToken().then(r => {
  const socketUrl = `${process.env.MSG_PUSH_URL}?token=${r.data.token}&name=httpRelay&room_ids=httpRelay&realm=${accessKey}`
  const websocketClient = new Client(socketUrl)
  const httpRelay = new HttpRelay(websocketClient)

  // 文件上传|文件下载
  router.get("/file/download", (req, res, options) => httpRelay.fileDownload(req, res, options))
  router.post("/file/upload", (req, res, options) => httpRelay.fileUpload(req, res, options))

  router.get("/api", (req, res, options) => httpRelay.apiOffer(req, res, options))
  router.post("/api", (req, res, options) => httpRelay.apiOffer(req, res, options))
  router.post("/api/answer", (req, res, options) => httpRelay.apiAnswer(req, res, options))
}).catch(reason => {
  logger.error(`获取授权令牌失败 - ${reason}`)
  httpServer.close()
})