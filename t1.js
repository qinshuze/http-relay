import fs from "fs";
import {PassThrough} from "node:stream"

const filename = "./upload/aaa.txt"
const ws = fs.createWriteStream(filename, {flags: "a+"})
// const pass = new PassThrough();
// pass.pipe(ws);
// pass.unpipe(ws);

const rs = fs.createReadStream(filename, {encoding: "utf-8", end: 1000000086})

// rs.read()
// rs.pipe(ws)
// rs.on("data", (data) => {
//     console.log(data.toString())
// })

setInterval(() => {
    ws.write("123123")
}, 1000)

setInterval(() => {
    console.log(rs.read(1024))
}, 1200)