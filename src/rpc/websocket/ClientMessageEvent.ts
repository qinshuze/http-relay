export class ReceiveMessage {
    constructor(
        readonly sender: string,
        readonly type: string,
        readonly content: string,
    ) {
    }
}

// noinspection TypeScriptValidateTypes
export default class ClientMessageEvent extends Event{
    constructor(readonly data: ReceiveMessage) {
        super('message');
    }
}