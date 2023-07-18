"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
class WSMsgClient {
    constructor(websocket, appId) {
        this.websocket = websocket;
        this.appId = appId;
        this.timeout = 60000;
    }
    callRemoteMethod(method, params) {
        return new Promise((resolve, reject) => {
            if (this.websocket.getConnection().readyState !== WebSocket.OPEN) {
                throw new Error("websocket连接尚未打开");
            }
            let isTimeout = false;
            const out = setTimeout(() => {
                isTimeout = true;
                reject({ code: 408, msg: "远程方法返回超时" });
            }, this.timeout);
            const msgId = (0, crypto_1.randomUUID)().toString();
            this.websocket.broadcastToDeviceByName([this.appId], JSON.stringify(params || []), `rpc@${method}`, msgId);
            const handler = (event) => {
                const data = JSON.parse(event.data);
                if (data.msgId !== msgId)
                    return;
                clearTimeout(out);
                this.websocket.getConnection().removeEventListener("message", handler);
                resolve(data.data);
            };
            this.websocket.getConnection().addEventListener("message", handler);
        });
    }
    getFileInfo(path) {
        return this.callRemoteMethod("getFileInfo", { path });
    }
    fileReceiveReady() {
        return this.callRemoteMethod("fileReceiveReady");
    }
}
exports.default = WSMsgClient;
