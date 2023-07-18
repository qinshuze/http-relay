"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendMessage = void 0;
const ws_1 = require("ws");
const logger_1 = __importDefault(require("../../utils/logger"));
const crypto_1 = require("crypto");
const ClientEventTarget_1 = __importDefault(require("./ClientEventTarget"));
const ClientMessageEvent_1 = __importDefault(require("./ClientMessageEvent"));
class SendMessage {
    constructor() {
        this.msgType = 'msg';
        this.msg = '';
        this.data = [];
        this.options = {};
        this.msgId = '';
    }
}
exports.SendMessage = SendMessage;
class Client extends ClientEventTarget_1.default {
    constructor(url) {
        super();
        this.url = url;
        this.reconnecting = false;
        this.connect();
    }
    isOpen() {
        return this.connection.readyState === ws_1.WebSocket.OPEN;
    }
    getState() {
        return this.connection.readyState;
    }
    call(appId, method, params) {
        return new Promise((resolve, reject) => {
            const msgId = (0, crypto_1.randomUUID)().toString();
            this.broadcastToByName([appId], params, `httpRelay@${method}`, msgId);
            const timeout = setTimeout(() => {
                this.removeEventListener("message", callback);
                reject("消息响应超时");
            }, 10000);
            const callback = (ev) => {
                const message = ev.data;
                if (message.msgId !== msgId)
                    return;
                clearTimeout(timeout);
                this.removeEventListener("message", callback);
                resolve(message.data);
            };
            this.addEventListener("message", callback);
        });
    }
    connect() {
        this.connection = new ws_1.WebSocket(this.url);
        this.connection.addEventListener("open", () => {
            logger_1.default.info("websocket 连接成功 " + this.url);
        });
        this.connection.addEventListener("close", () => {
            logger_1.default.warn("websocket 连接关闭 " + this.url);
        });
        this.connection.addEventListener("error", (event) => {
            logger_1.default.error("websocket 发生错误 " + event.message);
        });
        this.connection.addEventListener("message", (event) => {
            if (typeof event.data !== "string")
                return;
            const message = JSON.parse(event.data);
            const receiverMessage = JSON.parse(message.content);
            receiverMessage.sender = message.sender;
            this.dispatchEvent(new ClientMessageEvent_1.default(receiverMessage));
        });
    }
    reconnect() {
        if (this.reconnecting)
            return;
        this.reconnecting = true;
        this.connect();
        this.connection.addEventListener("open", () => {
            this.reconnecting = false;
        }, { once: true });
        this.connection.addEventListener("close", () => {
            this.reconnecting = false;
        }, { once: true });
    }
    getConnection() {
        return this.connection;
    }
    broadcast(message) {
        switch (this.connection.readyState) {
            case ws_1.WebSocket.OPEN:
                this.connection.send(JSON.stringify({
                    names: message.options.names,
                    content: JSON.stringify(message)
                }));
                break;
            case ws_1.WebSocket.CLOSED:
            case ws_1.WebSocket.CLOSING:
            case ws_1.WebSocket.CONNECTING:
                this.reconnect();
                this.connection.addEventListener("open", () => {
                    this.connection.send(JSON.stringify({
                        names: message.options.names,
                        content: JSON.stringify(message)
                    }));
                }, { once: true });
                break;
            default:
                logger_1.default.error("消息发送失败，连接状态异常：" + this.connection.readyState);
        }
    }
    broadcastToByName(names, data, msgType = "msg", msgId = "") {
        this.broadcast({
            msgType,
            data,
            msgId,
            options: { names }
        });
    }
}
exports.default = Client;
