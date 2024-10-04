import { readdir, mkdir, exists } from "node:fs/promises";
import path from "node:path" 
import _ from "lodash"
import { parseRoute, parseRequest, routes, routeValue, routeParam } from "./src/routes";
import { type Server } from "bun"
import * as Hydration from "./src/hydration.ts"
import * as Methods from "./src/method.ts"
import { Method } from "./src/method.ts"
import { listenLable, startInfo } from "./src/utils.ts";
import { type Handler } from "./src/routes";

interface Config {
	port: string,
	hostname?: string,
	public?: string,
	routes?: string,
	React?: any,
	ReactDom?: any,
	production?: boolean,
}

interface WebSocket {
	path: "/ws",
	onopen: (ws:any) => any,
	onmessage: (ws:any, message: any) => any,
	onclose: (ws:any, code: any) => any,
}

export interface Nudol {


	port: string;
	hostname: string;
	url?: URL;
	handlers: Map<Handler, (request: Request) => any>;
	handler: Handler | null;
	public_path: string|null;
	public_alias: string|null;
	routes_path: string|null;
	websocket: WebSocket | null;
	upgrade_function: (( server: Server, request: Request) => Promise<boolean>) | null;
	temp_dir: boolean; 
	temp_path: string; 

	static_routes: any;

	production: boolean;

	createElement: any
	renderToString: any

	get( path: string, fn: (request: Request) => void ): void 
	post( path: string, fn: (request: Request) => void ): void 
	routes( routes_directory_path: string, params?: { headers: any } ): Promise<void>

	routeValue(this: Nudol, name: string): any 
	routeParam(this: Nudol, name: string): string|null 

	hydrationScript( hydrationpath: string ): any
	hydrationBuild(): Promise<any> 
	
}

export class Nudol implements Nudol {

	constructor(config: Config) {

		this.port = config.port;
		this.hostname = config.hostname || "0.0.0.0",
		this.handlers = new Map([])
		//FIXME: config.public to config.public.(path, alias)  
		this.public_path = config.public || null;
		this.public_alias = null;
		this.routes_path = null;
		this.createElement = config.React.createElement;
		this.renderToString = config.ReactDom.renderToString;
		this.handler = null;
		this.websocket = null; 
		this.upgrade_function = null;
		this.temp_dir = false;
		this.temp_path = ".temp";
		this.static_routes = {};
		this.production = config.production || false;

	}
	
	ws( ws: WebSocket ) {

		this.websocket = ws;

	}

	upgrade( fn: ( server: Server, request: Request ) => Promise<boolean> ) {
		this.upgrade_function = fn
	}

	notfound( methods: Method[] , fn: (request: Request) => void ) {

		for(let method of methods) {
			this.handlers.set(parseRoute(method, "404"), fn)
		}

	}

	public( path: string, alias: string = "public" ) {

		this.public_path = path;
		this.public_alias = alias;

	}


	async listen() {
		const self = this

		startInfo( this.hostname,this.port, this.handlers, this.websocket )

		Bun.serve({
			port: this.port,
			hostname: this.hostname,
			static: this.static_routes,
			async fetch(req: Request ) {

				self.handler = parseRequest(req)

				self.url = new URL(req.url)

				if(self.handler.parts.length > 1) {
					if((self.handler.parts[1].value).toLowerCase() == self.public_alias) {
						return new Response(Bun.file(path.join( self.public_path, self.handler.parts[self.handler.parts.length - 1].value ) ))
					} 
				}
				
				for(const [key, handler] of self.handlers) {

					let equal = true;

					if(self.handler.parts.length != key.parts.length) continue; 

					for(const [id, part] of self.handler.parts.entries()) {

						const find = _.find(key.variables, function(k: any) {
							return k.id == part.id && part.value != "" 
						})

						if(find) {

							self.handler?.variables?.push({ id: find.id, name: find.name, value: part.value})

						} else {
							if(part.value != key.parts[id].value) {
								equal = false
								break;
							}
						}

					}

					if(equal == false) continue;

					return handler(req)

				}

				for( const [key, handle] of self.handlers.entries()) {
					if(_.find([key], { method: req.method, path: "404"})) {
						return handle(req)
					}
				}

				if(self.websocket != null) {
					if(self.websocket.path == self.url.pathname) {
						if(self.upgrade_function) {
							const success = await self.upgrade_function( this, req )

							if (success) {
								return undefined;
							}

						} else {

							const success = this.upgrade(req);

							if (success) {
							  return undefined;
							}

						}
					}
				}

				return new Response("404 Not found", { status: 404 });
			},
			websocket: {
				async open(ws) {
					self.websocket!.onopen(ws)
				},
				async message(ws, message) {
					self.websocket!.onmessage(ws, message)
				},
				async close(ws, code) {
					self.websocket!.onclose(ws, code)
				}
			}
		});

	}
}

Nudol.prototype.routes = routes;
Nudol.prototype.routeValue = routeValue;
Nudol.prototype.routeParam = routeParam;

Nudol.prototype.get = Methods.get;
Nudol.prototype.post = Methods.post;

Nudol.prototype.hydrationScript = Hydration.script;
