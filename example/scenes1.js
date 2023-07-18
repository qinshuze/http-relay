// noinspection DuplicatedCode

import {WebSocket} from "ws";
import express from "express";
import {randomUUID} from "crypto";

// 初始化服务
const msgClient = new WebSocket("ws://letscall.finda.buzz:8001?name=httpReady&room_id=httpReady")
const httpServer = express()
const uploadDir = "D:\\Develop\\Project\\test-file-upload\\upload"
msgClient.on("close", () => {
    console.log("websocket关闭")
})

// 设置默认响应头
httpServer.use((req, res, next) => {
    res.setHeader("Content-Type", "application/json")
    res.setHeader("Access-Control-Allow-Origin", req.header("origin") || "*")
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Request-Method", "PUT,POST,GET,DELETE,OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    res.setTimeout(30000, () => {
        if (!res.headersSent) {
            res.setHeader("Cache-control", "no-store")
            res.status(408)
        }

        res.end()
        console.log("由于响应长时间没有消息发送，已关闭连接")
    })

    req.setTimeout(30000, () => {
        console.log("由于请求长时间没有消息发送，已关闭连接")
        if (!res.headersSent) {
            res.setHeader("Cache-control", "no-store")
            res.status(408)
        }

        res.end()
        req.destroy()
    })

    next()
})

function jsonResult(code = 200, data = [], msg = "ok", err = "") {
    return JSON.stringify({
        code, data, msg, err
    })
}

function sendJsonMsg(msgId, msgType = "msg", data = {}, options = {}, msg = "") {
    return JSON.stringify({
        msgId, msgType, data, options, msg
    })
}

const sourceRequestMap = new Map()

// 文件上传处理
httpServer.post("/app/file/upload", (req, res) => {
    const sid = req.query.sid
    const sReq = sourceRequestMap.get(sid)

    req.on("end", () => {
        console.log("上传完毕，关闭请求")
        res.end(jsonResult())
    })

    sReq.fileUpload(req, res)
})

httpServer.get("/file/download", (req, res) => {
    const appId = req.query.app_id
    const filepath = req.query.path

    const reqId = randomUUID().toString()

    const [unit, rangesStr] = req.header("Range").split("=")
    if (unit !== "bytes") {
        res.sendStatus(416)
    }

    const ranges = []
    rangesStr.replace(/\s+/g, "").split(",").map((item, index) => {
        const tmpArr = item.split("-")
        ranges.push({start: tmpArr.shift() || 0, end: tmpArr.shift() || 0})
    })

    // 发送消息获取手机端文件信息
    msgClient.send(sendJsonMsg(reqId, "rpc@getFileInfo", {path: filepath, start: ranges[0].start, end: ranges[0].end}, {names: [appId]}))
    const answerCallback = (event) => {
        const msgData = JSON.parse(event.data)
        const result = msgData.data
        if (msgData.msgId !== reqId) return;

        msgClient.removeEventListener("message", answerCallback)

        if (result.code !== 200) {
            res.status(result.code)
            res.end(jsonResult(result.code, [], result.msg, result.err))
            return;
        }

        const fileInfo = {
            name: result.data.name,
            lastModified: result.data.lastModified,
            size: result.data.size,
            mimeType: result.data.mimeType,
        }

        const ETag = "W/\"" + fileInfo.size.toString(16) + "-" + fileInfo.lastModified.toString(16) + "\""
        const lastModified = new Date(fileInfo.lastModified).toUTCString()

        const ifNoneMatch = req.header("If-None-Match")
        if (ifNoneMatch && ifNoneMatch === ETag) {
            res.sendStatus(304)
            return;
        }

        const ifModifiedSince = req.header("If-Modified-Since")
        if (ifModifiedSince && ifModifiedSince === lastModified) {
            res.sendStatus(304)
            return;
        }

        // 发送消息给客户端，告知服务器已经做好接收文件的准备
        msgClient.send(sendJsonMsg(reqId, "rpc@fileReceiveReady", {path: filepath, start: ranges[0].start, end: ranges[0].end}, {names: [appId]}))

        const rangeStart = ranges[0].start
        const rangeEnd = ranges[0].end || fileInfo.size
        res.setHeader('Content-Length', fileInfo.size)
        res.setHeader("Content-Type", fileInfo.mimeType)
        res.setHeader("Cache-Control", "max-age=5");
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Last-Modified", new Date(fileInfo.lastModified).toUTCString());
        res.setHeader("ETag", ETag);
        res.setHeader("Content-Range", `bytes ${rangeStart}-${rangeEnd - 1}/${fileInfo.size}`)
        res.status(206)

        sourceRequestMap.set(reqId, {
            fileUpload: (tReq, tRes) => {
                let disconnect = true

                tReq.on("data", (data) => {
                    res.write(data, "binary")
                })
                tReq.on("end", () => disconnect = false)
                tReq.on("close", () => {
                    if (disconnect) {
                        res.status(502)
                        res.write("上游请求意外中断")
                        console.log("上游请求意外中断")
                    }
                    res.end()
                })
            }
        })
    }

    msgClient.addEventListener("message", answerCallback)
})

httpServer.listen(8100)