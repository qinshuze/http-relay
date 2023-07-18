"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger = {
    info(msg) {
        console.log('\x1b[32m%s\x1b[0m', `[${new Date().toLocaleString()}][Info] ${msg}`);
    },
    error(msg) {
        console.log('\x1b[31m%s\x1b[0m', `[${new Date().toLocaleString()}][Error] ${msg}`);
    },
    warn(msg) {
        console.log('\x1b[33m%s\x1b[0m', `[${new Date().toLocaleString()}][Warn] ${msg}`);
    }
};
exports.default = logger;
