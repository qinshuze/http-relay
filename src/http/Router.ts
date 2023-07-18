import {IncomingMessage, ServerResponse} from "node:http";
import {parse, UrlWithParsedQuery} from "url";

export type Options = {urlParsedQuery: UrlWithParsedQuery}

export default class Router {

    private posts: Map<string, (req: IncomingMessage, res: ServerResponse, options: Options) => any> = new Map()
    private gets: Map<string, (req: IncomingMessage, res: ServerResponse, options: Options) => any> = new Map()
    private interceptors: Array<(req: IncomingMessage, res: InstanceType<typeof ServerResponse> & { req: InstanceType<typeof IncomingMessage> }, next: () => any, options: Options) => any> = []

    checkRouteIsExist(pathname: string, req: IncomingMessage) {
        const postController = this.posts.get(pathname)
        const getController = this.gets.get(pathname)

        let exist = false
        if (req.method === "POST" && postController) exist = true;
        if (req.method === "GET" && getController) exist = true;
        if (req.method === "OPTIONS" && (getController || postController)) exist = true;

        return exist
    }

    private controller(req: IncomingMessage, res: InstanceType<typeof ServerResponse> & { req: InstanceType<typeof IncomingMessage> }, options: Options) {
        switch (req.method) {
            case "POST":
                this.posts.get(<string>options.urlParsedQuery.pathname)?.(req, res, options)
                break
            case "GET":
                this.gets.get(<string>options.urlParsedQuery.pathname)?.(req, res, options)
                break
        }
    }

    run(req: IncomingMessage, res: InstanceType<typeof ServerResponse> & { req: InstanceType<typeof IncomingMessage> }) {
        const options: Options = {
            urlParsedQuery: parse(req.url || "", true)
        }

        let inters = [...this.interceptors]
        const next = () => {
            const interceptor = inters.shift()
            if (interceptor) {
                interceptor(req, res, next, options)
            } else {
                this.controller(req, res, options)
            }
        }

        next()
    }

    post(path: string, callback: (req: IncomingMessage, res: ServerResponse, options: Options) => any) {
        this.posts.set(path, callback)
    }

    get(path: string, callback: (req: IncomingMessage, res: ServerResponse, options: Options) => any) {
        this.gets.set(path, callback)
    }

    interceptor(callback: (req: IncomingMessage, res: ServerResponse, next: () => any, options: Options) => any) {
        this.interceptors.push(callback)
    }
}