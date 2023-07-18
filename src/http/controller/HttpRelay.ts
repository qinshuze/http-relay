import {IncomingMessage, ServerResponse} from "node:http";
import {Options} from "../Router";
import Client from "../../rpc/websocket/Client";
import AppClient, {FileInfo} from "../../rpc/AppClient";
import {ParsedUrlQuery} from "querystring";
import {randomUUID} from "crypto";
import logger from "../../utils/logger";

type ClientRequest = {
    req: IncomingMessage, res: ServerResponse, init?: (req: IncomingMessage, res: ServerResponse) => any, fileInfo?: FileInfo,
    ranges?: { start: number, end: number }[], etag?: string
}

export default class HttpRelay {
    static clientRequestMap: Map<string, ClientRequest> = new Map()

    constructor(private webSocketClient: Client) {
    }

    /**
     * 参数过滤
     * @param params
     * @private
     */
    private filterParams(params: ParsedUrlQuery) {
        const data = {}
        for (let paramsKey in params) {
            if (paramsKey[0] === "_") continue;
            data[paramsKey] = params[paramsKey]
        }

        return data
    }

    /**
     * 文件下载
     * @param req
     * @param res
     * @param options
     */
    fileDownload(req: IncomingMessage, res: ServerResponse, options: Options) {
        const params = options.urlParsedQuery.query
        const appid = String(params._aid || "")

        // 如果请求头包含内容范围字段，并且类型不是bytes则不处理直接响应422，告知客户端无法处理该类型的内容
        const headerRange = this.getHeaderRange(req)
        if (headerRange.unit && headerRange.unit !== "bytes") {
            return this.sendResponse(res, 422, "Unprocessable Content")
        }

        // 检查websocket是否已打开
        if (!this.webSocketClient.isOpen()) {
            this.sendResponse(res, 500, "Msg client not ready")
            this.webSocketClient.reconnect()
            return;
        }

        // 如果appid存在，则通知指定的客户端推送数据，否则拉取指定客户端请求的数据
        if (appid) {
            const filepath = String(params._path || "")
            if (!filepath) {
                return this.sendResponse(res, 422, "Parameter missing")
            }

            // 获取文件信息
            const cid = randomUUID().toString()
            const appClient = new AppClient(appid, this.webSocketClient)
            appClient.getFileInfo(filepath, this.filterParams(params)).then((result) => {
                if (result.code === 404) {
                    return this.sendResponse(res, 404, "Not Found", JSON.stringify(result))
                }

                if (result.code !== 200) {
                    return this.sendResponse(res, 502, "Gateway response abnormal", JSON.stringify(result))
                }

                const fileInfo = <FileInfo>result.data
                const ETag = this.getETag(fileInfo)
                const lastModified = new Date(fileInfo.lastModified).toUTCString()

                // 判断请求内容范围是否合法
                for (let range of headerRange.ranges) {
                    if (range.start > (range.end || fileInfo.size)) {
                        res.setHeader("Content-Range", `*/${fileInfo.size}`)
                        return this.sendResponse(res, 416, "Range Not Satisfiable")
                    }
                }

                // 请求头存在 if-none-match 字段，并且etag标识符未改变，则表示资源未更改，可以直接使用缓存
                const ifNoneMatch = req.headers["if-none-match"]
                if (ifNoneMatch && ifNoneMatch === ETag) {
                    return this.sendResponse(res, 304, "Not Modified")
                }

                // 请求头存在 If-Modified-Since 字段，并且等于资源最后修改时间，则表示资源未更改，可以直接使用缓存
                const ifModifiedSince = req.headers["if-modified-since"]
                if (ifModifiedSince && ifModifiedSince === lastModified) {
                    return this.sendResponse(res, 304, "Not Modified")
                }

                // 创建本地客户端请求
                HttpRelay.clientRequestMap.set(cid, {req, res, fileInfo, ranges: headerRange.ranges, etag: ETag})
                // 通知指定客户端已做好接收文件的准备
                let rangeStart = headerRange.ranges[0]?.start || 0
                let rangeEnd = headerRange.ranges[0]?.end || fileInfo.size
                rangeEnd = rangeStart == rangeEnd ? (rangeEnd + 1) : rangeEnd
                rangeEnd = rangeEnd > fileInfo.size ? fileInfo.size : rangeEnd
                appClient.fileReceiveReady(filepath, rangeStart, rangeEnd, cid).then((result1) => {
                    if (result.code === 404) {
                        return this.sendResponse(res, 404, "Not Found", JSON.stringify(result))
                    }

                    if (result1.code !== 200) {
                        return this.sendResponse(res, 502, "Gateway response abnormal", JSON.stringify(result))
                    }
                }).catch(reason => {
                    return this.sendResponse(res, 504, "Gateway Timeout")
                })

                // 请求关闭后，清理数据
                res.on("close", () => HttpRelay.clientRequestMap.delete(cid))
            }).catch(reason => {
                return this.sendResponse(res, 504, "Gateway Timeout")
            })
        } else {
            const cid = String(params._cid || "")
            if (!cid) {
                return this.sendResponse(res, 422, "Parameter missing")
            }

            const clientRequest = HttpRelay.clientRequestMap.get(cid)
            if (!clientRequest) {
                return this.sendResponse(res, 422, "Invalid parameter cid")
            }

            this.fileRelay(clientRequest.req, clientRequest.res, cid, req, res)
        }
    }

    /**
     * 文件上传
     * @param req
     * @param res
     * @param options
     */
    fileUpload(req: IncomingMessage, res: ServerResponse, options: Options) {

        const params = options.urlParsedQuery.query
        const appid = String(params._aid || "")
        const mimeType = String(req.headers["content-type"] || "")
        const fileInfo = {
            name: String(params._filename || ""),
            size: Number(params._filesize || 0),
            lastModified: Number(params._file_last_modified || 0),
            mimeType: mimeType
        }

        if (!fileInfo.name || !fileInfo.size || !fileInfo.lastModified) {
            return this.sendResponse(res, 422, "Parameter missing")
        }

        if (!mimeType) {
            return this.sendResponse(res, 415, "Unsupported Media Type")
        }

        // // 检查请求媒体类型是否受支持
        // const allowType = ["image", "audio", "video"]
        // const type = mimeType.split("/").shift() || ""
        // if (!allowType.includes(type)) {
        //     return this.sendResponse(res, 415, "HttpRelay - 415 Unsupported Media Type")
        // }

        // 检查websocket是否已打开
        if (!this.webSocketClient.isOpen()) {
            return this.sendResponse(res, 500, "Msg client not ready")
        }

        res.setHeader("Connection", "close")

        // 上传完成后立即发送响应，结束此次请求
        req.on("end", () => {
            this.sendResponse(res, 200, "ok")
        })

        // 如果appid存在，则通知指定的客户端来拉取数据，否则将数据转发给指定客户端请求
        if (appid) {
            // 创建本地客户端请求
            const cid = randomUUID().toString()
            HttpRelay.clientRequestMap.set(cid, {req, res, fileInfo})

            // 通知指定客户端，数据已准备就绪，可以来拉取数据
            const appClient = new AppClient(appid, this.webSocketClient)
            appClient.fileUpload(fileInfo, this.filterParams(params), cid)
                .then((result) => {
                    if (result.code === 404) {
                        return this.sendResponse(res, 404, "Not Found", JSON.stringify(result))
                    }

                    if (result.code !== 200) {
                        return this.sendResponse(res, 502, "Gateway response abnormal", JSON.stringify(result))
                    }
                })
                .catch(reason => {
                    return this.sendResponse(res, 504, "Gateway Timeout")
                })

            // 请求关闭后，清理数据
            res.on("close", () => HttpRelay.clientRequestMap.delete(cid))
        } else {
            const cid = String(params._cid || "")
            if (!cid) {
                return this.sendResponse(res, 422, "Parameter missing")
            }

            this.fileRelay(req, res, cid)
        }
    }

    /**
     * 获取请求内容范围
     * @param req
     * @private
     */
    private getHeaderRange(req: IncomingMessage) {
        const headerRange = String(req.headers.range || "")
        const [unit, rangesStr] = headerRange.split("=")
        type rangeType = { start: number, end: number }
        const ranges: rangeType[] = []
        for (const item of rangesStr?.replace(/\s+/g, "")?.split(",") || []) {
            const tmpArr = item.split("-")
            const range = {start: Number(tmpArr.shift() || 0), end: Number(tmpArr.shift() || 0)}
            ranges.push(range)
        }

        return {unit, ranges}
    }

    /**
     * 文件转发
     * @param req 来源请求
     * @param res 来源请求
     * @param cid 客户端请求id
     * @param targetReq 目标请求
     * @param targetRes 目标请求
     * @private
     */
    private fileRelay(req: IncomingMessage, res: ServerResponse, cid: string, targetReq?: IncomingMessage, targetRes?: ServerResponse) {
        // 客户端请求id存在，但是找不到对应的客户端请求
        const clientRequest = HttpRelay.clientRequestMap.get(cid)
        if (!clientRequest) {
            return this.sendResponse(res, 422, "Invalid parameter cid")
        }

        // 删除掉客户端请求映射，一个客户端请求只能有一个终端请求进行处理
        HttpRelay.clientRequestMap.delete(cid)

        const newTargetReq = (targetReq || clientRequest.req)
        const newTargetRes = (targetRes || clientRequest.res)

        const fileInfo = clientRequest.fileInfo
        if (!fileInfo) {
            logger.error(`${req.url} fileInfo 信息丢失`)
            return this.sendResponse(res, 500, "Internal Server Error", "file info is null")
        }

        const lastModified = new Date(fileInfo.lastModified).toUTCString()

        // 设置响应头
        newTargetRes.setHeader('Content-Length', fileInfo.size)
        newTargetRes.setHeader("Content-Type", fileInfo.mimeType)
        newTargetRes.setHeader("Cache-Control", "public, max-age=0");
        newTargetRes.setHeader("Last-Modified", lastModified);
        newTargetRes.setHeader("ETag", clientRequest.etag || this.getETag(fileInfo));
        newTargetRes.setHeader('Content-Disposition', `filename="${encodeURIComponent(fileInfo.name)}"`)

        // 如果是要获取文件的某一部分，则只响应文件的指定部分
        const ranges = clientRequest.ranges || this.getHeaderRange(clientRequest.req).ranges
        const rangeStart = ranges[0]?.start || 0
        const rangeEnd = ranges[0]?.end || (fileInfo.size - 1)
        if (ranges.length) {
            newTargetRes.setHeader('Content-Length', rangeEnd - rangeStart + 1)
            newTargetRes.setHeader("Accept-Ranges", "bytes");
            newTargetRes.setHeader("Content-Range", `bytes ${rangeStart}-${rangeEnd}/${fileInfo.size}`)
            newTargetRes.statusCode = 206
        }

        // 开始转发文件流
        let dataSize = 0
        req.on("data", data => {
            dataSize += data.length
            if (newTargetRes.writableEnded || newTargetRes.closed) return;
            newTargetRes.write(data)
        })

        const st = setInterval(() => {
            console.log(`${parseInt((dataSize / 1024) + "")} KB/s`)
            dataSize = 0
        }, 1000)

        req.on("end", () => {
            console.log("写入完成")
            this.sendResponse(newTargetRes)
        })

        // 如果在数据转发过程中，客户端被中断，则关闭当前请求并响应异常状态
        newTargetRes.on("close", () => {
            if (newTargetRes.writableEnded) return;
            this.sendResponse(res, 500, "Client request interrupted unexpectedly")
        })

        // 如果在数据转发过程中，当前请求被意外中断，则关闭客户端请求并响应异常状态
        res.on("close", () => {
            clearInterval(st)
            if (newTargetRes.writableEnded) return;
            this.sendResponse(newTargetRes, 502, "Gateway request interrupted unexpectedly")
        })

        clientRequest.init?.(req, res)
    }

    /**
     * 获取etag
     * @param fileInfo
     * @private
     */
    private getETag(fileInfo: FileInfo) {
        return "W/\"" + fileInfo.size.toString(16) + "-" + fileInfo.lastModified.toString(16) + "\""
    }

    /**
     * 发送响应，如果响应头已发送，则直接销毁连接
     * @param res
     * @param code
     * @param statusMsg
     * @param content
     * @private
     */
    private sendResponse(res: ServerResponse, code: number = 200, statusMsg: string = "", content: string = "") {
        if (res.writableEnded || res.socket?.destroyed || res.closed) return;
        res.statusCode = code
        statusMsg && (res.statusMessage = `HttpRelay - ${statusMsg}`)
        content ? res.end(content) : res.end()
    }

    /**
     * api请求邀约
     * @param req
     * @param res
     * @param options
     */
    apiOffer(req: IncomingMessage, res: ServerResponse, options: Options) {
        const method = String(options.urlParsedQuery.query._method || "")
        const appid = String(options.urlParsedQuery.query._aid || "")

        // 必填参数不能为空
        if (!method || !appid) {
            return this.sendResponse(res, 422, "Parameter missing")
        }

        // 检查websocket是否已打开
        if (!this.webSocketClient.isOpen()) {
            this.sendResponse(res, 500, "Msg client not ready")
            this.webSocketClient.reconnect()
            return;
        }

        const contentType = req.headers["content-type"] || 'text/plain'
        const allowTypes = ["text/plain", "application/json"]
        res.setHeader("Content-Type", "application/json")

        if (!allowTypes.includes(contentType)) {
            this.sendResponse(res, 415, "Unsupported Media Type")
        }

        // 获取请求参数
        let body = ""
        req.on("data", data => {
            body += data
        })

        req.on("end", () => {
            let data: any = body
            const cid = randomUUID().toString()

            switch (contentType) {
                case "application/json":
                    try {
                        data = this.filterParams(JSON.parse(body))
                    } catch (e) {
                        this.sendResponse(res, 415, "invalid JSON string")
                        return
                    }
                    break
            }

            HttpRelay.clientRequestMap.set(cid, {req, res})
            res.on("close", () => HttpRelay.clientRequestMap.delete(cid))

            // 转发请求到app客户端
            const appClient = new AppClient(appid, this.webSocketClient)
            appClient.apiOffer(method, this.filterParams(options.urlParsedQuery.query), data, cid)
                .then((result) => {
                    if (result.code === 404) {
                        return this.sendResponse(res, 404, "Not Found", JSON.stringify(result))
                    }

                    if (result.code !== 200) {
                        this.sendResponse(res, 502, "Gateway response abnormal", JSON.stringify(result))
                        return;
                    }
                })
                .catch(reason => {
                    this.sendResponse(res, 504, "Gateway Timeout")
                })
        })
    }

    /**
     * api请求应答
     * @param req
     * @param res
     * @param options
     */
    apiAnswer(req: IncomingMessage, res: ServerResponse, options: Options) {
        const cid = String(options.urlParsedQuery.query._cid || "")

        if (!cid) {
            return this.sendResponse(res, 422, "Parameter missing")
        }

        const clientRequest = HttpRelay.clientRequestMap.get(cid)

        // 客户端请求id存在，但是找不到对应的客户端请求
        if (!clientRequest) {
            return this.sendResponse(res, 422, "Invalid parameter cid")
        }

        // 开始转发数据
        req.on("data", data => {
            clientRequest.res.write(data)
        })

        req.on("end", () => {
            this.sendResponse(res, 200, "ok")
            this.sendResponse(clientRequest.res)
        })

        // 如果在数据转发过程中，客户端被中断，则关闭当前请求并响应异常状态
        clientRequest.res.on("close", () => {
            if (req.readableEnded) return;
            this.sendResponse(res, 502, "Gateway request interrupted unexpectedly")
        })

        // 如果在数据转发过程中，当前请求被意外中断，则关闭客户端请求并响应异常状态
        res.on("close", () => {
            if (req.readableEnded) return;
            this.sendResponse(clientRequest.res, 502, "Gateway request interrupted unexpectedly")
        })
    }
}