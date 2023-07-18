export default interface AppDataChannel {
    call(appId: string, method: string, params: object): Promise<object>
}