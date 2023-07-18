import dotenv from "dotenv"
import minimist from "minimist"
import {WebSocket} from "ws";
import express from "express";
import fs from "fs";
import Busboy from "busboy";
import {randomUUID} from "crypto";
import * as path from "path";

dotenv.config()

// 获取服务端口号
const args = minimist(process.argv.slice(2));
const port = args.port || 8100

// 初始化服务
let msgClient = new WebSocket(process.env.MSG_PUSH_URL)
const httpServer = express()
const uploadDir = process.env.UPLOAD_DIR
const sourceRequestDataMap = new Map()
const fileList = new Map()

let connecting = true //
msgClient.addEventListener("open", () => {
    connecting = false
})
msgClient.addEventListener("close", () => {
    connecting = false
})

// 设置默认响应头
httpServer.use((req, res, next) => {

    res.setHeader("Content-Type", "application/json")
    res.setHeader("Access-Control-Allow-Origin", req.header("origin") || "*")
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Request-Method", "PUT,POST,GET,DELETE,OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    res.setTimeout(60000, () => {
        res.status(408)
        res.end()
        console.log("由于响应长时间没有消息发送，已关闭连接")
    })

    req.setTimeout(60000, () => {
        console.log("由于请求长时间没有消息发送，已关闭连接")
        req.destroy()
    })

    next()
})

function jsonResult(code = 200, data = [], msg = "ok", err = "") {
    return JSON.stringify({
        code,data,msg,err
    })
}

function sendJsonMsg(msgId, msgType = "msg", data = {}, options = {}, msg = "") {
    return JSON.stringify({
        msgId, msgType, data, options, msg
    })
}

// 文件上传处理
httpServer.post("/app/file/upload", (req, res) => {
    const reqId = req.query.id
    const sourceReqData = sourceRequestDataMap.get(reqId)

    if (!reqId) {
        sourceReqData.error(422)
        res.end(jsonResult(422, [], "id字段不能为空", "The id field cannot be empty"))
        return;
    }

    if (!sourceReqData) {
        sourceReqData.error(500)
        res.end(jsonResult(500, [], "请求来源不存在", "Request source does not exist"))
        return;
    }

    const bb = Busboy({headers: req.headers})
    let disconnect = true

    bb.on('file', (name, file, info) => {
        sourceReqData.file(name,file,info)
    })

    req.on("end", () => {
        disconnect = false
        res.end(jsonResult())
    })

    req.on("close", () => {
        if (disconnect) {
            sourceReqData.disconnect()
        }
    })

    req.pipe(bb)
})

httpServer.get("/file/download", (req, res) => {
    const appId = req.query.appId
    const pathname = req.query.path

    if (!appId) {
        res.status(422)
        res.end(jsonResult(422, [], "appId字段不能为空", "The appId field cannot be empty"))
        return;
    }

    if (!pathname) {
        res.status(422)
        res.end(jsonResult(422, [], "path字段不能为空", "The path field cannot be empty"))
        return;
    }

    if (msgClient.readyState !== WebSocket.OPEN) {
        res.status(503)
        res.end(jsonResult(503, [], "socket连接尚未就绪", "The connection is not yet open."))

        if (!connecting) {
            msgClient = new WebSocket(process.env.MSG_PUSH_URL)
        }

        return;
    }

    let isTimeout = false
    const timeout = setTimeout(() => {
        isTimeout = true
        msgClient.removeEventListener("message", answerCallback)
        res.status(504)
        res.end(jsonResult(4100, [], "应答超时", "answer timeout"))
    }, 10000)

    const reqId = randomUUID().toString()

    // 发送消息获取手机端文件信息
    msgClient.send(sendJsonMsg(reqId, "rpc@getFileInfo", {filename: pathname}, {names: [appId]}))
    const answerCallback = (event) => {
        if (isTimeout) return;
        const msgData = JSON.parse(event.data)
        const result = msgData.data
        if (msgData.msgId !== reqId) {
            return;
        }

        clearTimeout(timeout)
        msgClient.removeEventListener("message", answerCallback)
        if (result.code !== 200) {
            res.status(result.code)
            res.end(jsonResult(result.code, [], result.msg, result.err))
            return;
        }

        const localFilePath = (uploadDir + "/" + appId + pathname).replaceAll("/", path.sep)
        const fileInfo = fileList.get(localFilePath) || {}

        fileInfo.updateTime = fileInfo.updateTime || result.data.lastModified
        fileInfo.expired = fileInfo.expired || (new Date().getTime() + 604800000) // 默认过期时间一周
        fileInfo.writeState = fileInfo.writeState || "wait" // 文件写入状态：wait - 等待写入，write - 写入中，pause - 暂停写入，end - 写入结束
        fileInfo.readState = fileInfo.writeState || "wait" // 文件读取状态：wait - 等待读取，read - 读取中，pause - 暂停读取，end - 写入结束
        fileInfo.name = fileInfo.name || result.data.name
        fileInfo.size = fileInfo.size || result.data.filesize
        fileInfo.localPath = fileInfo.localPath || localFilePath
        fileInfo.remotePath = fileInfo.remotePath || pathname
        fileInfo.mimeType = fileInfo.mimeType || ''

        fileList.set(localFilePath, fileInfo)

        res.setHeader('Content-Length', fileInfo.size)
        res.setHeader("Content-Type", fileInfo.mimeType)
        res.setHeader("Cache-Control", "max-age=5");
        res.setHeader("Accept-Ranges", "bytes");
        // res.setHeader('Content-Disposition', 'attachment; filename=' + fileInfo.name)

        // 如果远程文件没有更新，并且文件写入状态为已结束，则直接返回本地文件
        if (fileInfo.writeState === "end" && fileInfo.updateTime === result.data.lastModified) {
            res.sendFile(localFilePath)
            return;
        }

        // 如果文件状态为等待写入 或者 远程文件已更新，并且文件写入状态为已结束，则通知远程端上传最新的文件到服务器
        if (fileInfo.writeState === "wait" || (fileInfo.writeState === "end" && fileInfo.updateTime !== result.data.lastModified)) {
            fileInfo.writeState = "wait"
            // 发送消息给客户端，告知服务器已经做好接收文件的准备
            msgClient.send(sendJsonMsg(reqId, "rpc@fileReceiveReady", {filename: pathname}, {names: [appId]}))
        }

        if (fileInfo.writeState === "write") {
            const stream = fileInfo.stream
            stream.pause()

            const rs = fs.createReadStream(localFilePath)
            rs.on("data", (data) => {
                res.write(data)
            })

            rs.on("end", () => {
                let disconnect = true
                stream.on("data", (data) => {
                    res.write(data)
                })

                stream.on("end", () => {
                    disconnect = false
                })

                stream.on("close", () => {
                    if (disconnect) {
                        res.status(500)
                        res.end()
                    } else {
                        res.end()
                    }
                })

                stream.resume()
            })
        }

        if (fileInfo.writeState === "wait") {
            const requestData = {
                req,
                error: (code) => {
                    res.sendStatus(code)
                },
                file: (name, filestream, info) => {
                    fileInfo.writeState = "write"
                    fileInfo.mimeType = info.mimeType
                    fileInfo.stream = filestream

                    const paths = localFilePath.split(path.sep)
                    const fname = paths.pop()
                    const dir = paths.join(path.sep)

                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, {recursive: true})
                    }

                    const ws = fs.createWriteStream(localFilePath)
                    console.log("接收到文件，并创建写入流", localFilePath)

                    filestream.on("data", (data) => {
                        ws.write(data)
                        res.write(data)
                    })

                    let disconnect = true
                    filestream.on("end", () => {
                        disconnect = false
                        console.log("写入结束")
                    })

                    filestream.on("close", () => {
                        ws.end()
                        fileInfo.stream = null
                        if (disconnect) {
                            res.status(500)
                            res.end()
                            console.log("网络流意外关闭")
                        } else {
                            fileInfo.writeState = "end"
                            res.end()
                        }
                    })
                },
                disconnect: () => {
                    fileInfo.stream?.destroy()
                    sourceRequestDataMap.delete(reqId)
                    fileList.delete(localFilePath)
                    fs.access(localFilePath, fs.constants.F_OK,(err) => {
                        if (!err) {
                            console.log(localFilePath, "文件存在，即将删除")
                            fs.rm(localFilePath, (err) => {
                                console.log(err, "==========")
                            })
                        }
                    })
                    res.status(500)
                    res.end(jsonResult(4100, [], "远程端意外中断"))
                    // res.destroy()
                    console.log("请求中断")
                }
            }

            sourceRequestDataMap.set(reqId, requestData)
        }
    }

    msgClient.addEventListener("message", answerCallback)
})

httpServer.listen(port)