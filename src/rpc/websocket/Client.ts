import {WebSocket} from "ws";
import logger from "../../utils/logger";
import AppDataChannel from "../AppDataChannel";
import {randomUUID} from "crypto";
import ClientEventTarget from "./ClientEventTarget";
import ClientMessageEvent, {ReceiveMessage} from "./ClientMessageEvent";

type SendMessage = {
    names: string[]
    roomIds: string[]
    tags: string[]
    content: string
}

type Content = {
    msgId: string,
    msgType: string,
    payload: any
}

export default class Client extends ClientEventTarget implements AppDataChannel {
    // @ts-ignore
    private connection: WebSocket
    public reconnecting: boolean = false

    constructor(private url: string) {
        super();
        this.connect()
    }

    isOpen(): boolean {
        return this.connection.readyState === WebSocket.OPEN
    }

    getState() {
        return this.connection.readyState
    }

    call(appId: string, method: string, params: object): Promise<object> {
        return new Promise((resolve, reject) => {
            const msgId = randomUUID().toString()
            this.broadcastToByName([appId], params, `httpRelay@${method}`, msgId)

            const timeout = setTimeout(() => {
                this.removeEventListener("message", callback)
                reject("消息响应超时")
            }, 10000)

            const callback = (ev: ClientMessageEvent) => {
                const content: Content = JSON.parse(ev.data.content)
                if (content.msgId !== msgId) return;
                clearTimeout(timeout)
                this.removeEventListener("message", callback)

                resolve(content.payload)
            }

            this.addEventListener("message", callback)
        })
    }

    connect() {
        this.connection = new WebSocket(this.url)

        this.connection.addEventListener("open", () => {
            logger.info("websocket 连接成功 " + this.url)
        })

        this.connection.addEventListener("close", () => {
            logger.warn("websocket 连接关闭 " + this.url)
        })

        this.connection.addEventListener("error", (event) => {
            logger.error("websocket 发生错误 " + event.message)
        })

        this.connection.addEventListener("message", (event) => {
            if (typeof event.data !== "string") return;
            const message = <ReceiveMessage>JSON.parse(event.data)
            this.dispatchEvent(new ClientMessageEvent(message))
        })
    }

    reconnect() {
        if (this.reconnecting) return;
        this.reconnecting = true
        this.connect()
        this.connection.addEventListener("open", () => {
            this.reconnecting = false
        }, {once: true})
        this.connection.addEventListener("close", () => {
            this.reconnecting = false
        }, {once: true})
    }

    getConnection() {
        return this.connection
    }

    broadcast(message: SendMessage) {
        switch (this.connection.readyState) {
            case WebSocket.OPEN:
                this.connection.send(JSON.stringify(message))
                break
            case WebSocket.CLOSED:
            case WebSocket.CLOSING:
            case WebSocket.CONNECTING:
                this.reconnect()
                this.connection.addEventListener("open", () => {
                    this.connection.send(JSON.stringify(message))
                }, {once: true})
                break
            default:
                logger.error("消息发送失败，连接状态异常：" + this.connection.readyState)
        }
    }

    broadcastToByName(names: string[], data: any, msgType: string = "msg", msgId: string = "") {
        this.broadcast({
            names,
            roomIds: [],
            tags: [],
            content: JSON.stringify(<Content>{
                msgType,
                msgId,
                payload: data
            })
        })
    }
}