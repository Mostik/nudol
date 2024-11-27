import _ from "lodash"

import { generateRoute, type Handler } from "./src/routes";
import * as Log from "./src/logs.ts";

import { type Server } from "bun"
import { Method } from "./src/method.ts"

import * as Methods from "./src/method.ts"
import { fsRoutes, hydrationScript, type RoutesParams } from "./src/filesystem.ts";
import { fsStatic } from "./src/static.ts"

//TODO: config store as object in nudol 
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
	routes_path: string|null;
	websocket: WebSocket | null;
	temp_dir: boolean; 
	temp_path: string; 
	static_routes: any;

	production: boolean;
	key?: string;
	cert?: string;

	server: Server | undefined;


	createElement: any,
	renderToString: any,

	get:  ( this: Nudol, path: string, fn: (request: Request) => void  ) => void, 
	post: ( this: Nudol, path: string, fn: (request: Request) => void ) => void, 

	ws: ( ws: WebSocket ) => void;

	upgrade_function: (( server: Server, request: Request) => Promise<boolean>) | null;
	upgrade: ( fn: ( server: Server, request: Request) => Promise<boolean> ) => void;

	notfound: ( methods: Method[] , fn: (request: Request) => void ) => void;
	fsStatic: ( path: string, alias?: string ) => Promise<void>;

	listen(): void,

	fsRoutes( routes_directory_path: string, params?: RoutesParams ): Promise<void>
	//
	// routeValue(this: Nudol, name: string): any 
	// routeParam(this: Nudol, name: string): string|null 
	//
	hydrationScript( hydrationpath: string ): any
	hydrationBuild(): Promise<any> 
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
		routes_path: null,
		websocket: null, 
		temp_dir: false,
		temp_path: ".temp",
		static_routes: {},

		server: undefined,
		
		production: config.production || false,
		key: config.key,
		cert: config.cert,

		upgrade_function: null,

		createElement: null,
		renderToString: null,

		ws: ws, 
		get: Methods.get,
		post: Methods.post,

		upgrade: function( fn: ( server: Server, request: Request ) => Promise<boolean> ) {
			this.upgrade_function = fn
		},

		notfound: function ( methods: Method[] , fn: (request: Request) => void ) {

			for(let method of methods) {
				this.handlers.set(generateRoute(method, "404"), fn)
			}

		},


		hydrationScript: hydrationScript,
		hydrationBuild: function(): Promise<any> { return new Promise( function () {} )},

		fsStatic: fsStatic, 
		fsRoutes: fsRoutes,

		listen: listen 

	}

	return instance

}


function ws( this: Nudol, ws: WebSocket ) {
	this.websocket = ws
}

async function listen( this: Nudol ) {
	const self = this

	Log.start( this )

	this.server = Bun.serve({

		port: this.port,
		hostname: this.hostname,
		static: this.static_routes,
		keyFile: this.key,
		certFile: this.cert,

		async fetch( req: Request ) {

			self.url = new URL(req.url)
			
			for(const [handler, handler_function] of self.handlers) {

				let check = self.url.pathname.match( handler.regexp ) 

				if( check ) {

					self.handler = { ...handler, params: check.groups } as Handler

					return handler_function( req )

				}

			}

			const notfound = [...self.handlers ].find(( [k, _] ) => (k.path == "404" && k.method == req.method) )

			if( notfound ) return notfound[1]( req ) 

			// if(self.websocket != null) {
			// 	if(self.websocket.path == self.url.pathname) {
			// 		if(self.upgrade_function) {
			// 			const success = await self.upgrade_function( this, req )
			//
			// 			if (success) {
			// 				return undefined;
			// 			}
			//
			// 		} else {
			//
			// 			const success = this.upgrade(req);
			//
			// 			if (success) {
			// 			  return undefined;
			// 			}
			//
			// 		}
			// 	}
			// }

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


