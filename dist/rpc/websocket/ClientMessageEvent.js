"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiveMessage = void 0;
class ReceiveMessage {
    constructor(sender, type, content) {
        this.sender = sender;
        this.type = type;
        this.content = content;
    }
}
exports.ReceiveMessage = ReceiveMessage;
// noinspection TypeScriptValidateTypes
class ClientMessageEvent extends Event {
    constructor(data) {
        super('message');
        this.data = data;
    }
}
exports.default = ClientMessageEvent;
