import { readdir, mkdir, exists } from "node:fs/promises";
import path from "node:path" 
import _ from "lodash"
import { parseRoute, parseRequest } from "./src/routes";

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
	routes_path: string|null;
	url?: URL;

	createElement: any
	renderToString: any
	

	constructor(config: Config) {

		this.port = config.port;
		this.handlers = new Map([])
		this.public_path = config.public || null;
		this.routes_path = null;
		this.createElement = config.React.createElement;
		this.renderToString = config.ReactDom.renderToString;
		this.handler = null;

	}

	get( path: string, fn: (request: Request) => void ) {

		this.handlers.set(parseRoute("GET", path), fn)

	}

	post( path: string, fn: (request: Request) => void ) {

		this.handlers.set(parseRoute("POST", path), fn)

	}

	public( path: string ) {

		this.public_path = path;

	}

	async routes( routes_directory_path: string ) {

		this.routes_path = routes_directory_path;

		const files = await readdir(this.routes_path);

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
					const handler_path = path.join("/", name.toLowerCase() )
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

			// const { name, ext } = path.parse(file)

			component_path = path.join("../", this.routes_path!, file)

			const genfilename = path.join("./.tmp", file.toLowerCase()) 

			entrypoints.push(genfilename)

			if(!(await exists("./.tmp"))) {
				await mkdir("./.tmp")
			}

			Bun.write(genfilename,
				`
					import { hydrateRoot } from "react-dom/client"\n
					import HydrationComponent from "${component_path}"\n
					hydrateRoot(document.getElementById('root'), <HydrationComponent></HydrationComponent>)\n
				`
			)

		}

		await Bun.build({
			entrypoints: entrypoints,
			outdir: './.tmp',
			format: "esm",
		});

	}

	hydrationScript() {

		let file_path = (this.url!.pathname?.split("/")[1])?.toLowerCase()
		
		if(this.url!.pathname == "/") {

			file_path = "index"

		}

		return this.createElement("script", { type: "module", src: `./.tmp/${file_path}.js`, defer: 'defer' })

	}

	listen() {

		const self = this

		if(this.routes_path) {
			self.client()
		}

		console.log("Listen ", this.port)
		console.log(self.handlers)

		Bun.serve({
			port: this.port,
			fetch(req) {
				
				self.handler = parseRequest(req)

				self.url = new URL(req.url)

				if((self.handler.parts[1].value).toLowerCase() == "public") {
					return new Response(Bun.file("." + self.url.pathname))
				} 
				if((self.handler.parts[1].value).toLowerCase() == ".tmp") {
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

				return new Response("404 Not found");
			},
		});

	}
}

