import path from "node:path" 
import _ from "lodash"

import { parseRoute, parseRequest, routes, routeValue, routeParam, type RoutesParams } from "./src/routes";
import { Method } from "./src/method.ts"
import { startInfo } from "./src/utils.ts";

import { type Handler } from "./src/routes";
import { type Server } from "bun"

import * as Hydration from "./src/hydration.ts"
import * as Methods from "./src/method.ts"

interface Config {
	port: string,
	hostname?: string,
	production?: boolean,

	key?: string,
	cert?: string,
}

interface WebSocket {
	path: "/ws",
	idleTimeout: number,
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
	temp_dir: boolean; 
	temp_path: string; 
	static_routes: any;

	production: boolean;
	key?: string;
	cert?: string;

	// createElement: any
	// renderToString: any

	get:  ( this: Nudol, path: string, fn: (request: Request) => void  ) => void, 
	post: ( this: Nudol, path: string, fn: (request: Request) => void ) => void, 

	ws: ( ws: WebSocket ) => void;

	upgrade_function: (( server: Server, request: Request) => Promise<boolean>) | null;
	upgrade: ( fn: ( server: Server, request: Request) => Promise<boolean> ) => void;

	notfound: ( methods: Method[] , fn: (request: Request) => void ) => void;
	public: ( path: string, alias: string ) => void;


	listen(): void,

	// routes( routes_directory_path: string, params?: RoutesParams ): Promise<void>
	//
	// routeValue(this: Nudol, name: string): any 
	// routeParam(this: Nudol, name: string): string|null 
	//
	// hydrationScript( hydrationpath: string ): any
	// hydrationBuild(): Promise<any> 
	//
	// ws( ws: WebSocket): void
	
}

export function Nudol( config: Config ): Nudol {

	var instance: Nudol = { 
		port: config.port,
		hostname: config.hostname || "0.0.0.0",
		url: undefined,
		handlers: new Map([]),
		handler: null,
		public_path: null,
		public_alias: null,
		routes_path: null,
		websocket: null, 
		temp_dir: false,
		temp_path: ".temp",
		static_routes: {},
		
		production: config.production || false,
		key: config.key,
		cert: config.cert,

		upgrade_function: null,

		ws: ws, 
		get: Methods.get,
		post: Methods.post,

		upgrade: function( fn: ( server: Server, request: Request ) => Promise<boolean> ) {
			this.upgrade_function = fn
		},

		notfound: function ( methods: Method[] , fn: (request: Request) => void ) {

			for(let method of methods) {
				this.handlers.set(parseRoute(method, "404"), fn)
			}

		},
		public: function ( path: string, alias: string = "public" ) {

			this.public_path = path;
			this.public_alias = alias;

		},

		listen: listen 


	}

	return instance

}


function ws( this: Nudol, ws: WebSocket ) {
	this.websocket = ws
}



async function listen( this: Nudol ) {
	const self = this

	startInfo( this.hostname,this.port, this.handlers, this.websocket )

	Bun.serve({
		port: this.port,
		hostname: this.hostname,
		static: this.static_routes,
		keyFile: this.key,
		certFile: this.cert,
		async fetch( req: Request ) {

			self.handler = parseRequest(req)

			self.url = new URL(req.url)

			if(self.handler.parts.length > 1) {
				if((self.handler.parts[1].value).toLowerCase() == self.public_alias) {
					return new Response(Bun.file(path.join( self.public_path, self.handler.parts[self.handler.parts.length - 1].value ) ))
				} 
			}

			console.log( self.handlers )
			
			for(const [key, handler] of self.handlers) {

				let equal = true;

				if(self.handler?.method != key.method ) continue;

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

			for( const [key, handle] of self.handlers.entries() ) {
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

			return new Response("404 Not found", { status: 404 } );
		},
		websocket: {
			idleTimeout: self.websocket?.idleTimeout,
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


