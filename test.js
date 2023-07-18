import {randomUUID} from 'crypto';
import {WebSocket} from "ws";

function randomString(length) {
    var str = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i)
        result += str[Math.floor(Math.random() * str.length)];
    return result;
}

function rand(m, n)  {
    return Math.ceil(Math.random() * (n-m+1) + m-1)
}

const max = 4000

const logger = {
    info(msg){
        console.log('\x1b[32m%s\x1b[0m', `[Info] ${msg}`)
    },
    warn(msg){
        console.log('\x1b[31m%s\x1b[0m', `[Warn] ${msg}`)
    },
    error(msg){
        console.log('\x1b[33m%s\x1b[0m', `[Error] ${msg}`)
    }
}
let num = 0
let fail=0
const nameArr = new Map()

for (let i = 0; i < max; i++) {
    let ms = rand(20, 100) * 1000
    setTimeout(() => createWebSocketConn(i), ms)

    // createWebSocketConn()

}
// createWebSocketConn()

function createWebSocketConn(i) {
    const name = randomUUID()
    const roomId = Math.ceil(Math.random()*100) + "";

    if (nameArr.size && nameArr.has(roomId)) {
        const a = nameArr.get(roomId)
        a.push(name)
        nameArr.set(roomId, a)
    } else {
        nameArr.set(roomId, [name])
    }

    let localIp = '192.168.31.37'
    // if (num > 39000) {
    //     localIp = '10.2.0.7'
    // } if (num > 30000) {
    //     localIp = '10.2.0.6'
    // }

    // 34.64.82.154 20.27.53.227
    const socket = new WebSocket(`ws://192.168.31.37:8001?name=${name}&room_id=${roomId}`, {
        localAddress: localIp
    })

    socket.isErr = false
    // const socket = new WebSocket(`ws://35.75.2.51:8001?name=${name}&room_id=${roomId}`)
    // const socket = new WebSocket(`ws://127.0.0.1:8001?name=${name}&room_id=${roomId}`)
    socket.onopen = () => {
        num++
        logger.info(`${num} - ${fail} - ${i} - ${name} open ok roomId: ${roomId}`)
        setInterval(() => {
            socket.send(JSON.stringify({msgType: "heartbeat"}))
        }, 10000)

        // 随机发送消息

        const callback = () => {
            const data = randomString(Math.ceil(Math.random()*100))
            const nameSet = nameArr.get(roomId).filter(n => n !== name)

            const arr = [
                {roomIds: [roomId]},
                {roomIds: [roomId], names: [nameSet[Math.ceil(Math.random()*nameSet.length) - 1]]},
                {names: [nameSet[Math.ceil(Math.random()*nameSet.length) - 1]]}
            ]
            const options = arr[Math.ceil(Math.random()*arr.length) - 1]
            // console.log("======send data======", name, roomId, options)
            socket.send(JSON.stringify({msgType: "msg", data, options: options}))
            setTimeout(callback, rand(30, 120) * 1000)
        }
        setTimeout(callback, rand(30, 120) * 1000)

        if ((num + fail) >= max) {
            console.log("结束")
        } else {
            // createWebSocketConn()
        }
    }

    socket.onclose = (ev) => {
        if (!socket.isErr) {
            fail++
        }

        logger.error(`${num} - ${fail} - ${i} - ${name} close roomId: ${roomId} - ${ev.reason}(${ev.code})`)
        if ((num + fail) >= max) {
            console.log("结束")
        } else {
            // createWebSocketConn()
        }
    }

    // socket.onmessage = (ev) => {
    //     console.log(ev.data)
    // }

    socket.onerror = (ev) => {
        fail++
        socket.isErr = true
        logger.warn(`${num} - ${fail} - ${i} - ${name} error roomId: ${roomId} - ${ev.message}`)
        if ((num + fail) >= max) {
            console.log("结束")
        } else {
            // createWebSocketConn()
        }
    }
}
