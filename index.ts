import { readdir, lstat, unlink } from "node:fs/promises";
import { Glob } from "bun"
import path from "node:path" 

export class Nudol {

	port: string;
	handlers: Map<string, () => any>;
	public_path: string|null;
	routes_path: string|null;
	current_url: string|null;

	createElement: any
	renderToString: any
	

	constructor( port: string, React: any, ReactDom: any ) {

		this.port = port;
		this.handlers = new Map()
		this.public_path = null;
		this.routes_path = null;
		this.createElement = React.createElement;
		this.renderToString = ReactDom.renderToString;
		this.current_url = null;

	}


	get( url: string, fn: () => void ) {

		this.handlers.set(url, fn)

	}

	public( path: string ) {

		this.public_path = path;

	}

	async routes( routes_directory_path: string ) {

		this.routes_path = routes_directory_path;

		const files = await readdir(this.routes_path);

		const glob = new Glob(path.join(this.routes_path!, "/*.jsx"))

		const doc = glob.match("routes/_document.jsx")

		for await (const file of glob.scan(".")) {
			console.log(file);
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

			(async () => {
				try {
					const module = await import(path.join(process.cwd(), path.join(this.routes_path!, file)))
					if(name == "index") {
						this.handlers.set("/", async () => {
							return ret_response(module.default)
						})
					} else if (name == "_document") {


					} else {
						this.handlers.set(path.join("/", name.toLowerCase()), async () => {
							return ret_response(module.default)
						})
					}
				} catch {

				}
			})()

		}

	} 

	async client() {

		const files = await readdir(this.routes_path!);

		let component_path = ""; 
		let entrypoints: string[] = []

		for(const file of files) {

			const ext = path.extname(file);
			const name = path.basename(file, ext);

			component_path = path.join("../routes/", file)

			const genfilename = path.join("./.tmp", file.toLowerCase()) 

			entrypoints.push(genfilename)

			Bun.write(genfilename,
				`
					import { hydrateRoot } from "react-dom/client"\n
					import HydrationComponent from "${component_path}"\n
					hydrateRoot(document.getElementById('root'), <HydrationComponent></HydrationComponent>)\n
				`
			)

		}

		console.log(await Bun.build({
			entrypoints: entrypoints,
			outdir: './.tmp',
		}));

	}

	hydrationScript() {

		return this.createElement("script", { src: `./.tmp/${this.current_url}.js`, defer: 'defer' })

	}

	listen() {

		const self = this

		self.client()

		Bun.serve({
			port: this.port,
			fetch(req) {
				self.current_url = (new URL(req.url).pathname.split("/")[1]).toLowerCase()

				if(self.current_url == "public") {
					return new Response(Bun.file("." + new URL(req.url).pathname))
				} 
				if(self.current_url == ".tmp") {
					return new Response(Bun.file("." + new URL(req.url).pathname))
				} 

				const handler = self.handlers.get(new URL(req.url).pathname)


				if(handler != undefined) {
					return handler()
				}

				return new Response("Bun!");
			},
		});

	}
}



