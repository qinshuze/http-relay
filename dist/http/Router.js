"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
class Router {
    constructor() {
        this.posts = new Map();
        this.gets = new Map();
        this.interceptors = [];
    }
    checkRouteIsExist(pathname, req) {
        const postController = this.posts.get(pathname);
        const getController = this.gets.get(pathname);
        let exist = false;
        if (req.method === "POST" && postController)
            exist = true;
        if (req.method === "GET" && getController)
            exist = true;
        if (req.method === "OPTIONS" && (getController || postController))
            exist = true;
        return exist;
    }
    controller(req, res, options) {
        var _a, _b;
        switch (req.method) {
            case "POST":
                (_a = this.posts.get(options.urlParsedQuery.pathname)) === null || _a === void 0 ? void 0 : _a(req, res, options);
                break;
            case "GET":
                (_b = this.gets.get(options.urlParsedQuery.pathname)) === null || _b === void 0 ? void 0 : _b(req, res, options);
                break;
        }
    }
    run(req, res) {
        const options = {
            urlParsedQuery: (0, url_1.parse)(req.url || "", true)
        };
        let inters = [...this.interceptors];
        const next = () => {
            const interceptor = inters.shift();
            if (interceptor) {
                interceptor(req, res, next, options);
            }
            else {
                this.controller(req, res, options);
            }
        };
        next();
    }
    post(path, callback) {
        this.posts.set(path, callback);
    }
    get(path, callback) {
        this.gets.set(path, callback);
    }
    interceptor(callback) {
        this.interceptors.push(callback);
    }
}
exports.default = Router;
