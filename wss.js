import {WebSocketServer} from "ws";

const webSocketServer = new WebSocketServer({port: 8001})
webSocketServer.on("connection", (socket, request) => {
    console.log("加入房间")
    socket.addEventListener("message", (msg) => {
        console.log("收到消息", msg.data, request.socket.remoteAddress, request.socket.remotePort)
        webSocketServer.clients.forEach(c => {
            if (c !== socket) {
                c.send(msg.data)
            }
        })
    })
})