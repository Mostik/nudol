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
	public_path: string|null;
	routes_path: string|null;
	pathname: string|null;

	createElement: any
	renderToString: any
	

	constructor(config: Config) {

		this.port = config.port;
		this.handlers = new Map([])
		this.public_path = config.public || null;
		this.routes_path = null;
		this.createElement = config.React.createElement;
		this.renderToString = config.ReactDom.renderToString;
		this.pathname = null;

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

		for (const file of files) {
			console.log("file:", file)
			if(file == "_document.jsx") {
				doc = true
			}
		}

		let doc_module = undefined;

		if(doc) {
			doc_module  = await import(path.join(process.cwd(), path.join(this.routes_path!, "_document.jsx")))
		}

		const ret_response = ( element: any ) => {

			if(doc) {
				return new Response(this.renderToString(
					this.createElement(
						doc_module.default,
						{ hydrationScript: this.hydrationScript.bind(this) },
						this.createElement(element)
					)
				), {
					headers: {
						'Content-type': "text/html; charset=utf-8"
					}
				})

			} else {
				return new Response(this.renderToString(this.createElement(element)), {
					headers: {
						'Content-type': "text/html; charset=utf-8"
					}
				})

			}

		} 

		for(const file of files) {

			const ext = path.extname(file);
			const name = path.basename(file, ext);


			try {
				const import_path = path.join(process.cwd(), this.routes_path!, file)
				const module = await import(import_path)

				if (name == "_document") {
				} else if(name == "index") {
					this.handlers.set({ method: "GET", path: "/", parts: [{id: 0, value: ""}], variables: [] }, async () => {
						return ret_response(module.default)
					})
					this.handlers.set({ method: "POST", path: "/", parts: [{id: 0, value: ""}], variables: [] }, async () => {
						return ret_response(module.default)
					})
				} else {
					//TODO: something
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

			const ext = path.extname(file);
			const name = path.basename(file, ext);

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

		let file_path = (this.pathname?.split("/")[1])?.toLowerCase()
		
		if(this.pathname == "/") {

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
				
				const parsedrequest = parseRequest(req)

				self.pathname = new URL(req.url).pathname

				if((parsedrequest.parts[1].value).toLowerCase() == "public") {
					return new Response(Bun.file("." + new URL(req.url).pathname))
				} 
				if((parsedrequest.parts[1].value).toLowerCase() == ".tmp") {
					return new Response(Bun.file("." + new URL(req.url).pathname))
				} 

				for(const [key, handler] of self.handlers) {

					let equal = true;

					if(parsedrequest.parts.length != key.parts.length) continue; 

					for(const [id, part] of parsedrequest.parts.entries()) {

						if(_.find(key.variables, function(k: any) {
							return k.id == part.id && part.value != "" 
						})) {

						} else {
							if(part.value == key.parts[id].value) {

							} else {
								equal = false
								break;
							}
						}

					}

					if(equal == false) continue;


					return handler(req)

				}

				return new Response("Bun!");
			},
		});

	}
}

