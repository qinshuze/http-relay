self.addEventListener("message", (event) => {
    if (event.data && event.data.action === "force-refresh") {
        self.skipWaiting()
    }
})

self.addEventListener("activate", (event) => {
    self.clients.claim();
})

const messageHandlers = new Map()
const clients = new Map()
self.addEventListener("message", event => {
    console.warn("data", event.data)
    switch (event.data.type) {
        case "register":
            clients.set(event.source.id, event.source)
    }

    console.info("clients", clients)
    const { type, data } = event.data;
    if (messageHandlers.has(type)) {
        messageHandlers.get(type)(data)
    }
})

function getHeaderRange(s, start = 0, end = 0) {
    const rangeObj = {start, end}

    if (!s) return rangeObj
    const headerRange = s.split("=")[1]
    if (!headerRange) return rangeObj
    const ranges = headerRange.split("-").map(v => parseInt(v))

    rangeObj.start = ranges[0] || start
    rangeObj.end = ranges[1] || end

    return rangeObj
}

self.addEventListener("fetch", (event) => {
    // return event.respondWith(handleRequest(event.request));
    const client = clients.get(event.clientId)
    if (event.request.url !== "http://localhost:63343/http-relay/example/webrtc/test.mp4") {
        event.respondWith(handleRequest(event.request));
        return
    }

    const headers = event.request.headers;
    // for (const [name, value] of headers.entries()) {
    //     console.log(`Headers: ${name}: ${value}`);
    // }

    const headerRangeStr = headers.get("range")
    const range = getHeaderRange(headerRangeStr)

    console.log('url: ', event.request.url)
    console.log('Request Headers Range: ', headerRangeStr)

    event.respondWith(new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            const response = new Response(null, {status: 408, statusText: "Network Request Timeout"})
            resolve(response)
        }, 5000)

        if (!headerRangeStr) {
            messageHandlers.set("put-video-info", (data) => {
                clearTimeout(timeout)
                const response = new Response(null, {
                    status: 200,
                    statusText: "ok",
                    headers: {
                        'Accept-Ranges': 'bytes', // 指定内容类型
                        'Cache-Control': 'no-cache', // 指定内容类型
                        'Content-Length': data.size, // 指定内容类型
                        'Content-Type': data.mimeType, // 指定内容类型
                        'Last-Modified': data.lastModified, // 自定义头信息
                        'X-Content-Type-Options': 'nosniff', // 自定义头信息
                    },
                })

                resolve(response)
            })

            // 通知客户端获取视频信息
            client.postMessage({type: "get-video-info", data: {}})
        } else {

            if (range.start === 0 && range.end === 0) {
                console.log("if range", range)
                messageHandlers.set("put-video-data-all", (data) => {
                    clearTimeout(timeout)
                    const {writable, readable} = new TransformStream()
                    const defaultWriter= writable.getWriter()

                    messageHandlers.set("put-video-stream-all", (videoStream) => {
                        defaultWriter.write(new Uint8Array(videoStream)).then(() => {
                            defaultWriter.close()
                        })
                    })

                    // 通知客户端获取视频流
                    client.postMessage({type: "get-video-stream-all", data: range})

                    const response = new Response(readable, {
                        status: 200,
                        statusText: "ok",
                        headers: {
                            'Accept-Ranges': 'bytes', // 指定内容类型
                            'Cache-Control': 'no-cache', // 指定内容类型
                            'Content-Length': data.size, // 指定内容类型
                            'Content-Type': data.mimeType, // 指定内容类型
                            'Date': new Date().toGMTString(),
                            'Last-Modified': new Date(data.lastModified).toGMTString(), // 自定义头信息
                            'Server': 'ServiceWorker', // 自定义头信息
                            'X-Content-Type-Options': 'nosniff', // 自定义头信息
                            'X-Frame-Options': 'SameOrigin', // 自定义头信息
                            'X-Xss-Protection': '1; mode=block', // 自定义头信息
                        }
                    })

                    resolve(response)
                })

                // 通知客户端获取视频信息
                client.postMessage({type: "get-video-data-all", data: range})
            } else {
                console.log("else range", range)
                messageHandlers.set("put-video-data-range", (data) => {
                    clearTimeout(timeout)
                    const {writable, readable} = new TransformStream()
                    const defaultWriter= writable.getWriter()

                    messageHandlers.set("put-video-stream-range", (videoStream) => {
                        defaultWriter.write(new Uint8Array(videoStream)).then(() => {
                            defaultWriter.close()
                        })
                    })

                    // 通知客户端获取视频流
                    client.postMessage({type: "get-video-stream-range", data: range})

                    const response = new Response(readable, {
                        status: 206,
                        statusText: "ok",
                        headers: {
                            'Accept-Ranges': 'bytes', // 指定内容类型
                            'Cache-Control': 'no-cache', // 指定内容类型
                            'Content-Length': data.chunkSize, // 指定内容类型
                            'Content-Range': `bytes ${range.start}-${range.end || data.size - 1}/${data.size}`, // 自定义头信息
                            'Content-Type': data.mimeType, // 指定内容类型
                            'Date': new Date().toGMTString(),
                            'Server': 'ServiceWorker', // 自定义头信息
                            'X-Content-Type-Options': 'nosniff', // 自定义头信息
                            'X-Frame-Options': 'SameOrigin', // 自定义头信息
                            'X-Xss-Protection': '1; mode=block', // 自定义头信息
                        },
                    })

                    resolve(response)
                })

                // 通知客户端获取视频信息
                client.postMessage({type: "get-video-data-range", data: range})
            }
        }
    }))

    // const response = new Response()



    // event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    return new Promise((resolve, reject) => {
        fetch(request).then(r => {
            console.log(r)
            resolve(r)
        })
    })
}

