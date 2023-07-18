"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ClientEventTarget extends EventTarget {
    /**
     * 添加事件监听器
     * @param type     监听事件类型
     * @param callback 触发事件后的回调函数
     * @param options 监听选项
     */
    addEventListener(type, callback, options) {
        super.addEventListener(type, callback, options);
    }
    /**
     * 移除事件侦听器
     * @param type 监听事件类型
     * @param callback 触发事件后的回调函数
     * @param options 监听选项
     */
    removeEventListener(type, callback, options) {
        super.removeEventListener(type, callback, options);
    }
    /**
     * 接收消息回调
     * @param callback 接收到消息后要执行的回调函数
     */
    onmessage(callback) {
        this.addEventListener("message", (ev) => {
            callback(ev.data);
        });
    }
}
exports.default = ClientEventTarget;
