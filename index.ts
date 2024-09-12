import { readdir, mkdir, exists } from "node:fs/promises";
import path from "node:path" 
import _ from "lodash"
import { parseRoute, parseRequest } from "./src/routes";
import { type Server } from "bun"

export interface PathPart {
	id: number,
	value: string,
}

export interface PathVariable {
	id: number,
	name: string,
	value?: string,
}

export interface Handler {
	method: string,
	path: string,
	parts: PathPart[],
	variables?: PathVariable[],
}

interface Config {
	port: string,
	host?: string,
	public?: string,
	routes?: string,
	React?: any,
	ReactDom?: any,
}

interface WebSocket {
	path: "/ws",
	onopen: (ws:any) => any,
	onmessage: (ws:any, message: any) => any,
	onclose: (ws:any, code: any) => any,
}

export enum Method {
	CONNECT = 'CONNECT',
	DELETE = 'DELETE',
	GET = 'GET',
	HEAD = 'HEAD',
	OPTIONS = 'OPTIONS',
	PATCH = 'PATCH',
	POST = 'POST',
	PUT = 'PUT',
	TRACE = 'TRACE',
}

const temp_path = ".temp"

/**
* @example
* ```ts
* const nudol = new Nudol({ port: "8080", host: "localhost"... })
*
* nudol.get("/", () => {
*   return new Response("Hello world")
* })
*
* nudol.listen()
* ```
*/
export class Nudol {

	port: string;
	handlers: Map<Handler, (request: Request) => any>;
	handler: Handler | null;
	public_path: string|null;
	public_alias: string|null;
	routes_path: string|null;
	url?: URL;
	websocket: WebSocket | null;
	upgrade_function: (( server: Server, request: Request) => Promise<boolean>) | null;
	temp_dir: boolean; 

	createElement: any
	renderToString: any
	

	constructor(config: Config) {

		this.port = config.port;
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

	}

	get( path: string, fn: (request: Request) => void ) {

		this.handlers.set(parseRoute("GET", path), fn)

	}

	post( path: string, fn: (request: Request) => void ) {

		this.handlers.set(parseRoute("POST", path), fn)

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

	async routes( routes_directory_path: string ) {

		this.routes_path = routes_directory_path;

		const read_path = path.join( this.routes_path )

		const files = await readdir( read_path );

		let doc = false 
		let doc_module = undefined;

		for (const file of files) {

			const { name, ext } = path.parse(file)

			if(name == "_document") {
				[".js", ".ts", ".jsx", ".tsx"].includes(ext)
				doc_module  = await import(path.join(process.cwd(), path.join(this.routes_path!, ("_document" + ext))))
				doc = true
			}

		}

		const ret_response = ( element: any ) => {

			const options = {
				headers: {
					'Content-type': "text/html; charset=utf-8"
				}
			}

			const resp = (doc) ?
				this.createElement(
					doc_module.default,
					{ hydrationScript: this.hydrationScript.bind(this) },
					this.createElement(element)
				)
				:
				this.createElement(element)

			return new Response( this.renderToString(resp), options)

		} 

		for(const file of files) {

			const { name, ext } = path.parse(file)

			try {
				const import_path = path.join(process.cwd(), this.routes_path!, file)
				const module = await import(import_path)

				if (name == "_document") {
				} else if(name == "index") {
					this.handlers.set(parseRoute("GET", "/"), async () => {
						return ret_response(module.default)
					})
					this.handlers.set(parseRoute("POST", "/"), async () => {
						return ret_response(module.default)
					})
				} else {
					const handler_path = "/" + name.toLowerCase();
					this.handlers.set(parseRoute("GET", handler_path), async () => {
						return ret_response(module.default)
					})
					this.handlers.set(parseRoute("POST", handler_path), async () => {
						return ret_response(module.default)
					})
				}
			} catch (error) {

				console.log("Error import file", error)

			}

		}

	} 

	async client() {

		const files = await readdir(this.routes_path!);

		let component_path = ""; 
		let entrypoints: string[] = []

		for(const file of files) {

			component_path = path.join(process.cwd(), this.routes_path!, file)

			const genfilename = path.join(process.cwd(), temp_path, file.toLowerCase()) 

			entrypoints.push(genfilename)

			if(!(await exists( path.join( process.cwd(), temp_path)))) {
				await mkdir( path.join( process.cwd(), temp_path) )
			}

			Bun.write(genfilename,
				`
					import { hydrateRoot } from "react-dom/client"\n
					import HydrationComponent from "${component_path}"\n
					hydrateRoot(document.getElementById('root'), <HydrationComponent></HydrationComponent>)\n
				`
			)

		}

		
		let outdir = path.join( process.cwd(), temp_path )

		const result = await Bun.build({
			entrypoints: entrypoints,
			format: "esm",
		});

		for (const res of result.outputs) {
		  const {base} = path.parse(res.path)
		  Bun.write(path.join(outdir, base), res);
		}

		if(!result.success) {
			console.log(result.logs)
			throw new Error("client error")
		} 
	}

	hydrationScript() {

		let file_path = (this.url!.pathname?.split("/")[1])?.toLowerCase()
		
		if(this.url!.pathname == "/") {

			file_path = "index"

		}

		return this.createElement("script", { type: "module", src: path.join( "./", temp_path, `${file_path}.js`), defer: 'defer' })

	}

	listen() {

		const self = this

		if(this.routes_path) {
			self.client()
		}

		console.log("Listen ", this.port)
		console.log(self.handlers)
		console.log(self.websocket)

		Bun.serve({
			port: this.port,
			async fetch(req) {

				self.handler = parseRequest(req)

				self.url = new URL(req.url)

				if((self.handler.parts[1].value).toLowerCase() == self.public_alias) {
					return new Response(Bun.file(path.join(self.public_path, self.handler.parts[self.handler.parts.length - 1].value ) ))
				} 
				if((self.handler.parts[1].value).toLowerCase() == ".temp") {
					return new Response(Bun.file("." + self.url.pathname))
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

