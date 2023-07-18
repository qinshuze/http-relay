"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AppClient {
    constructor(appId, dataTransfer) {
        this.appId = appId;
        this.dataTransfer = dataTransfer;
    }
    callRemoteMethod(method, params = {}) {
        return this.dataTransfer.call(this.appId, method, params)
            .then(res => res);
    }
    /**
     * 获取文件信息
     * @param path 文件路径
     * @param query 客户端请求查询参数
     */
    getFileInfo(path, query) {
        return this.callRemoteMethod("getFileInfo", { path, query });
    }
    /**
     * 告知终端已准备好接收文件
     * @param path 文件完整路径
     * @param start 开始位置 - 从第几个字节开始读取
     * @param end 结束位置 - 到第几个字节结束读取
     * @param cid 客户端请求id
     */
    fileReceiveReady(path, start, end, cid) {
        return this.callRemoteMethod("fileReceiveReady", { path, start, end, cid });
    }
    /**
     * 告知终端已接收到客户端上传文件请求
     * @param fileInfo 上传文件信息
     * @param query 客户端请求查询参数
     * @param cid 客户端请求id
     */
    fileUpload(fileInfo, query, cid) {
        return this.callRemoteMethod("fileUpload", { fileInfo, query, cid });
    }
    /**
     * 通知终端已接收到客户端api请求
     * @param method 本次客户端请求对应的处理方法
     * @param query 客户端请求查询参数
     * @param params 客户端请求体参数
     * @param cid 客户端请求id
     */
    apiOffer(method, query, params, cid) {
        return this.callRemoteMethod("apiOffer", { method, query, params, cid });
    }
}
exports.default = AppClient;
