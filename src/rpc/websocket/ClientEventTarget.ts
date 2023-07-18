import ClientEventMap from "./ClientEventMap";
import {ReceiveMessage} from "./ClientMessageEvent";

export default class ClientEventTarget extends EventTarget {
    /**
     * 添加事件监听器
     * @param type     监听事件类型
     * @param callback 触发事件后的回调函数
     * @param options 监听选项
     */
    addEventListener<K extends keyof ClientEventMap>(type: K, callback: (ev: ClientEventMap[K]) => any, options?: AddEventListenerOptions | boolean): void {
        super.addEventListener(type, callback as EventListener, options)
    }

    /**
     * 移除事件侦听器
     * @param type 监听事件类型
     * @param callback 触发事件后的回调函数
     * @param options 监听选项
     */
    removeEventListener<K extends keyof ClientEventMap>(type: K, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) {
        super.removeEventListener(type, callback, options)
    }

    /**
     * 接收消息回调
     * @param callback 接收到消息后要执行的回调函数
     */
    onmessage(callback: (message: ReceiveMessage) => any) {
        this.addEventListener("message", (ev) => {
            callback(ev.data)
        })
    }
}