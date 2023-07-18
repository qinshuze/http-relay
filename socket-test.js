const express = require("express")
const fs = require("fs");
const httpServer = express()

httpServer.use(express.static('./upload'))

httpServer.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Request-Method", "GET,POST,OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,Token")
    res.setHeader("Access-Control-Expose-Headers", "*")

    next()
})

httpServer.get("/hai1", async (req, res) => {
    let range = req.headers["range"];
    let [, start, end] = range.match(/(\d*)-(\d*)/);

    // 错误处理
    let statObj = fs.statSync("D:\\Develop\\Project\\test-file-upload\\upload\\aaa.zip");

    // 文件总字节数
    let total = statObj.size;

    // 处理请求头中范围参数不传的问题
    start = start ? parseInt(start) : 0;
    end = end ? parseInt(end) : total - 1;

    // 响应客户端
    res.statusCode = 206;
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
    let rs = fs.createReadStream("D:\\Develop\\Project\\test-file-upload\\upload\\haha.mp4", { start, end })

    let dataSize = 0
    rs.on("data", (data) => {
        dataSize += data.length
    })

    let si = setInterval(() => {
        console.log(parseInt(dataSize / 1024 + "") + "/KB")
    }, 1000)

    res.on("close", () => {
        console.log("响应关闭")
        clearInterval(si)
    })

    rs.pipe(res);
    // res.sendFile("D:\\Develop\\Project\\test-file-upload\\upload\\haha.mp4")
})

httpServer.get("/hai", (req, res) => {
    // console.log(req.header("referer"))
    // req.on("data", () => {
    //     console.log("aaaa")
    // })
    // req.on("end", () => {
    //     console.log("请求结束")
    // })
    // req.on("close", () => {
    //     console.log("关闭请求")
    //     res.write("hhhhh")
    //     res.statusCode = 500
    //     res.statusText = "kkkk"
    //     res.end("cccccc")
    //     // res.destroy()
    // })

    // res.on("close", () => {
    //     console.log("关闭响应" + res.writableEnded)
    //     res.statusCode = 500
    //     res.end("aaaaa")
    // })
    console.log(req.headers)
    res.sendFile("D:\\Develop\\Project\\test-file-upload\\upload\\aaa.zip")
})

httpServer.post("/upload", (req, res) => {
    console.log(`${new Date().getTime()} ${req.url}`)
    res.setHeader("Connection", "close")

    let size = 0
    req.on("data", data => {
        size += data.length
    })

    setTimeout(() => {
        req.socket.unref()
        res.statusCode = 500
        res.end()
        // res.destroy()
    }, 2000)
})

httpServer.listen(8010)