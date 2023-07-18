import fs from "fs";

const filename = "./upload/aaa.txt"
const rs = fs.createReadStream(filename, {encoding: "utf-8"})

rs.on("data", (data) => {
    console.log(data)
})
rs.on("end", () => {
    console.log("========")
})