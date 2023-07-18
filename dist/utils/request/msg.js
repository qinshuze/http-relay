"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../logger"));
const MsgPushRequest = axios_1.default.create({
    timeout: 10000,
    baseURL: process.env.MSG_PUSH_API_URL,
    headers: {
        "Content-Type": "application/json"
    },
});
MsgPushRequest.interceptors.response.use((response) => {
    var _a, _b, _c, _d, _e, _f;
    switch (response.status) {
        case 400:
            logger_1.default.error(`网络请求错误 - ${response.status} - ${(_a = response.data) === null || _a === void 0 ? void 0 : _a.err_msg} 网络接口请求错误，请检查网络连接后重试。`);
            break;
        case 401:
            break;
        case 403:
            logger_1.default.error(`访问受限 - ${response.status} - ${(_b = response.data) === null || _b === void 0 ? void 0 : _b.err_msg} 你没有访问指定资源的权限`);
            break;
        case 404:
            logger_1.default.error(`客户端请求错误 - ${response.status} - ${(_c = response.data) === null || _c === void 0 ? void 0 : _c.err_msg} 请求资源不存在或已被删除`);
            break;
        case 408:
            logger_1.default.error(`请求超时 - ${response.status} - ${(_d = response.data) === null || _d === void 0 ? void 0 : _d.err_msg} 接口请求超时`);
            break;
        case 422:
            logger_1.default.error(`参数输入错误 - ${response.status} - ${(_e = response.data) === null || _e === void 0 ? void 0 : _e.err_msg} 客户端参数输入错误`);
            break;
        default:
            if (response.status > 300) {
                logger_1.default.error(`网络请求异常 - ${response.status} - ${(_f = response.data) === null || _f === void 0 ? void 0 : _f.err_msg} 网络接口请求异常，请稍后重试`);
                break;
            }
    }
    return response;
}, (error) => {
    console.error(error);
    return Promise.reject(error);
});
exports.default = MsgPushRequest;
