import express from "express";
import {WebSocket} from "ws";
import * as fs from "fs";
import Busboy from "busboy"
import {randomUUID} from "crypto";

const handlers = new Map()
const reqhandlers = new Map()
const fileList = new Map()
const wsclient = new WebSocket("ws://127.0.0.1:8001")

const app = express();
app.requestTimeout = 6000

app.use((req, res, next) => {
    console.log(req.headers, req.host, req.url, req.method)
    res.setHeader("Content-Type", "application/json")

    res.setHeader("Access-Control-Allow-Origin", req.header("origin") || "*")
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Request-Method", "PUT,POST,GET,DELETE,OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    res.setTimeout(6000, () => {
        res.sendStatus(408)
    })

    next()
})

app.post("/upload", (req, res) => {
    const bb = Busboy({headers: req.headers})
    const newRes = handlers.get(req.query.id)
    const newReq = reqhandlers.get(req.query.id)

    if (!newRes) {
        res.end(JSON.stringify({
            code: 404,
            msg: "远程端未就绪",
            err: ""
        }))
        return;
    }

    bb.on('file', (name, file, info) => {
        const newRes = handlers.get(req.query.id)
        newRes.setHeader('Content-Length', req.query.filesize)
        newRes.setHeader("Content-Type", info.mimeType)
        newRes.setHeader("Cache-Control", "max-age=5");
        newRes.setHeader('Content-Disposition', 'attachment; filename=' + info.filename)

        file.on('data', (data) => {
            newRes.write(data)
        })

        file.on('end', () => {
            newRes.end()
        })

        console.log(name, info)
    })

    req.on("end", () => {
        res.end(JSON.stringify({
            code: 200,
            msg: "ok",
            err: ""
        }))
        console.log("请求结束")
    })

    req.on("close", () => {
        newRes.destroy()
        console.log("请求关闭")
    })

    req.pipe(bb)
})

app.get("/download/:filename", (req, res) => {
    const msgId = randomUUID().toString()
    wsclient.send(JSON.stringify({msgType: "downloadOffer", data: {filename: req.params.filename}, msgId: msgId}))

    const callback = (event) => {
        const data = JSON.parse(event.data)
        if (data.msgId !== msgId) return;
        wsclient.removeEventListener("message", callback)

        if (data.data.code !== 200) {
            res.status(data.data.code)
            res.end(JSON.stringify({
                code: data.data.code,
                msg: data.data.msg,
                err: data.data.err
            }))
            return;
        }

        handlers.set(msgId, res)
        reqhandlers.set(msgId, req)
        wsclient.send(JSON.stringify({msgType: "downloadReady", data: {filename: req.params.filename}, msgId}))
    }

    wsclient.addEventListener("message", callback)
})

app.listen(8100, (err) => {
    if (err) {
        console.error("http server start fail：", err)
    } else {
        console.log(`http server start success on http://0.0.0.0:8100`)
    }
})
