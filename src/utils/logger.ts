const logger = {
    info(msg: string){
        console.log('\x1b[32m%s\x1b[0m', `[${new Date().toLocaleString()}][Info] ${msg}`)
    },
    error(msg: string){
        console.log('\x1b[31m%s\x1b[0m', `[${new Date().toLocaleString()}][Error] ${msg}`)
    },
    warn(msg: string){
        console.log('\x1b[33m%s\x1b[0m', `[${new Date().toLocaleString()}][Warn] ${msg}`)
    }
}

export default logger;