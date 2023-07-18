"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiverMessage = void 0;
class ReceiverMessage {
    constructor(msgId = '', msgType, sender, msg = '', data = []) {
        this.msgId = msgId;
        this.msgType = msgType;
        this.sender = sender;
        this.msg = msg;
        this.data = data;
    }
}
exports.ReceiverMessage = ReceiverMessage;
// noinspection TypeScriptValidateTypes
class ClientMessageEvent extends Event {
    constructor(data) {
        super('message');
        this.data = data;
    }
}
exports.default = ClientMessageEvent;
