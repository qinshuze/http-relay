"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const minimist_1 = __importDefault(require("minimist"));
const dotenv_1 = require("dotenv");
const Router_1 = __importDefault(require("./http/Router"));
const logger_1 = __importDefault(require("./utils/logger"));
const crypto_js_1 = require("crypto-js");
const msg_1 = __importDefault(require("./utils/request/msg"));
const Client_1 = __importDefault(require("./rpc/websocket/Client"));
const HttpRelay_1 = __importDefault(require("./http/controller/HttpRelay"));
(0, dotenv_1.config)();
// 获取服务端口号
const args = (0, minimist_1.default)(process.argv.slice(2));
const port = args.port || 8005;
// 创建http服务器
const router = new Router_1.default();
const httpServer = (0, node_http_1.createServer)((req, res) => router.run(req, res));
httpServer.listen(port);
httpServer.on("clientError", (err, socket) => {
    // @ts-ignore
    logger_1.default.error(`HTTP/1.1 HttpRelay - ${err.code} ${err.message}`);
    // // @ts-ignore
    // if (err.code === 'ECONNRESET' || !socket.writable) {
    //     return;
    // }
    // @ts-ignore
    socket.end(`HTTP/1.1 400 HttpRelay - Bad Request\r\n\r\n`);
});
// 拦截设置
router.interceptor((req, res, next, options) => {
    // 跨域设置
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Request-Method", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,Token");
    res.setHeader("Access-Control-Expose-Headers", "*");
    if (req.method === "OPTIONS") {
        res.end();
        return;
    }
    // 设置缓存策略
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/plain");
    const exist = router.checkRouteIsExist(options.urlParsedQuery.pathname || "", req);
    if (!exist) {
        res.statusCode = 404;
        res.statusMessage = "HttpRelay - Route Not Found";
        res.end();
        return;
    }
    // 请求超时设置，主要用于解决由于客户端网络断开后无法及时通知服务器，导致请求一直无法释放
    req.setTimeout(60000, () => {
        logger_1.default.warn("由于客户端请求长时间未发送消息，服务器已关闭当前请求");
        req.destroy();
    });
    // 响应超时设置
    res.setTimeout(30000, () => {
        if (res.writableEnded || res.closed)
            return;
        res.statusCode = 408;
        res.statusMessage = "HttpRelay - Request Timeout";
        res.end();
    });
    // 记录日志
    res.on("finish", () => {
        const code = String(res.statusCode).substring(0, 1);
        const successCodes = ["1", "2", "3"];
        if (successCodes.includes(code))
            return;
        if (res.statusCode === 500) {
            return logger_1.default.error(`${req.method} ${res.statusCode} ${req.url} - ${res.statusMessage}`);
        }
        else {
            return logger_1.default.warn(`${req.method} ${res.statusCode} ${req.url} - ${res.statusMessage}`);
        }
    });
    next();
});
const accessKey = process.env.ACCESS_KEY || "";
const secret = process.env.ACCESS_SECRET || "";
function getAuthToken() {
    return __awaiter(this, void 0, void 0, function* () {
        const params = new URLSearchParams({
            access_key: accessKey,
            timestamp: parseInt(String(new Date().getTime() / 1000)) + "",
        });
        params.sort();
        const url = `${new URL(process.env.MSG_PUSH_API_URL || "").host}/token`;
        const signStr = `GET ${url}?${params.toString()}`;
        const hash = (0, crypto_js_1.HmacSHA512)(signStr, secret);
        const signature = Buffer.from(crypto_js_1.enc.Base64.stringify(hash)).toString("base64");
        params.set("signature", signature);
        return msg_1.default.get(`http://${url}?${params.toString()}`);
    });
}
getAuthToken().then(r => {
    const socketUrl = `${process.env.MSG_PUSH_URL}?token=${r.data.token}&name=httpRelay&room_ids=httpRelay&realm=${accessKey}`;
    const websocketClient = new Client_1.default(socketUrl);
    const httpRelay = new HttpRelay_1.default(websocketClient);
    // 文件上传|文件下载
    router.get("/file/download", (req, res, options) => httpRelay.fileDownload(req, res, options));
    router.post("/file/upload", (req, res, options) => httpRelay.fileUpload(req, res, options));
    router.get("/api", (req, res, options) => httpRelay.apiOffer(req, res, options));
    router.post("/api", (req, res, options) => httpRelay.apiOffer(req, res, options));
    router.post("/api/answer", (req, res, options) => httpRelay.apiAnswer(req, res, options));
}).catch(reason => {
    logger_1.default.error(`获取授权令牌失败 - ${reason}`);
    httpServer.close();
});
