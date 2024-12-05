import { fsRoutes, hydrationScript, type RoutesOptions } from "./src/filesystem.ts";
import { ws, upgrade } from "./src/websocket"

import { generateContext } from "./src/routes";
import { type Context, type Handler } from "./src/routes"
import { type WebSocket } from "./src/websocket"
import { type Server } from "bun"
import { Method } from "./src/method.ts"
import { fsStatic, type StaticOptions } from "./src/static.ts"


import * as Methods from "./src/method.ts"
import * as Log from "./src/logs.ts";

interface Config {
	port: string | number,
	hostname?: string,
	production?: boolean,
	logs?: boolean,

	key?: string,
	cert?: string,
}

export interface Nudol {
	config: Config,

	handlers: Map<Handler, (context: Context) => any>;
	routes_path: string|null;
	websocket: WebSocket | null;
	temp_dir: boolean; 
	temp_path: string; 
	static_routes: any;

	server: Server | undefined;

	get:  ( this: Nudol, path: string, fn: (request: Context) => void  ) => void, 
	post: ( this: Nudol, path: string, fn: (request: Context) => void ) => void, 
	notfound: ( methods: Method[] , fn: (request: Context) => void ) => void;

	ws: ( ws: WebSocket ) => void;

	upgrade_function: (( server: Server, request: Request) => Promise<boolean>) | null;
	upgrade: ( fn: ( server: Server, request: Request) => Promise<boolean> ) => void;


	fsStatic: ( path: string, alias?: StaticOptions ) => Promise<void>;
	fsRoutes( routes_directory_path: string, params?: RoutesOptions ): Promise<void>

	hydrationScript( hydrationpath: string ): any

	listen(): void,
	
}

export function Nudol( config: Partial<Config> = {} ): Nudol {

	var instance: Nudol = { 
		config: {
			port: 3000,
			hostname: "0.0.0.0",
			production: false,
			logs: true,
			key: undefined,
			cert: undefined,
			...config
		} as Config,
		handlers: new Map([]),
		routes_path: null,
		websocket: null, 
		temp_dir: false,
		temp_path: ".temp",
		static_routes: {},

		server: undefined,
		
		upgrade_function: null,

		ws: ws, 

		get: Methods.get,
		post: Methods.post,
		notfound: Methods.notfound, 

		upgrade: upgrade,
		hydrationScript: hydrationScript,

		fsStatic: fsStatic, 
		fsRoutes: fsRoutes,

		listen: listen 

	}

	return instance

}


function listen( this: Nudol ) {
	const self = this

	if(this.config.logs) Log.start( this )

	this.server = Bun.serve({

		port: this.config.port,
		hostname: this.config.hostname,
		static: this.static_routes,
		keyFile: this.config.key,
		certFile: this.config.cert,

		fetch( req: Request ) {

			for(const [handler, handler_function] of self.handlers) {

				if( req.method != handler.method ) continue;

				let check = new URL(req.url).pathname.match( handler.regexp ) 

				if( check ) {

					return handler_function( generateContext( req, check.groups ) )

				}

			}

			const notfound = [...self.handlers ].find(( [k, _] ) => (k.path == "404" && k.method == req.method) )

			if( notfound ) return notfound[1]( generateContext( req, {}) ) 

			// if(self.websocket != null) {
			// 	if(self.websocket.path == new URL(req.url).pathname) {
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


