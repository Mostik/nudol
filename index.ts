import { readdir, mkdir, exists } from "node:fs/promises";
import path from "node:path" 

type Method = string
type Path = string

export class Nudol {

	port: string;
	handlers: Map<Method, Map<Path, () => any>>;
	public_path: string|null;
	routes_path: string|null;
	pathname: string|null;

	createElement: any
	renderToString: any
	

	constructor( port: string, React: any, ReactDom: any ) {

		this.port = port;
		this.handlers = new Map([
			["GET", new Map()],
			["POST", new Map()],
			["PUT", new Map()],
			["PATCH", new Map()],
			["DELETE", new Map()],
			["HEAD", new Map()],
			["OPTIONS", new Map()],
		])
		this.public_path = null;
		this.routes_path = null;
		this.createElement = React.createElement;
		this.renderToString = ReactDom.renderToString;
		this.pathname = null;

	}


	get( path: string, fn: () => void ) {

		this.handlers.get("GET")?.set(path, fn)

	}

	post( path: string, fn: () => void ) {

		this.handlers.get("POST")?.set(path, fn)

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
					this.handlers.get("GET")?.set("/", async () => {
						return ret_response(module.default)
					})
					this.handlers.get("POST")?.set("/", async () => {
						return ret_response(module.default)
					})
				} else {
					this.handlers.get("GET")?.set(path.join("/", name.toLowerCase()), async () => {
						return ret_response(module.default)
					})
					this.handlers.get("POST")?.set(path.join("/", name.toLowerCase()), async () => {
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

		console.log(self.handlers)

		Bun.serve({
			port: this.port,
			fetch(req) {

				self.pathname = new URL(req.url).pathname

				//TODO: "public" folder can be "./public" pathname (/public) != ./public 

				if((self.pathname.split("/")[1]).toLowerCase() == "public") {
					return new Response(Bun.file("." + new URL(req.url).pathname))
				} 
				if((self.pathname.split("/")[1]).toLowerCase() == ".tmp") {
					return new Response(Bun.file("." + new URL(req.url).pathname))
				} 

				const handler = self.handlers.get(req.method)?.get(new URL(req.url).pathname)

				if(handler != undefined) { 
					return handler()
				}

				return new Response("Bun!");
			},
		});

	}
}

