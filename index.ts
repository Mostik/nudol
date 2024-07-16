import { readdir, lstat } from "node:fs/promises";
// import { renderToString } from "react-dom/server"
// import { createElement } from "react"
import { Glob } from "bun"
import path from "node:path" 

// (async () => {
// 	const module = await import(path.join(process.cwd(), file)) 
// 	console.log(module)
// })()


export class Oli {

	port: string;
	handlers: Map<string, () => any>;
	public_path: string|null;
	routes_path: string|null;

	createElement: any
	renderToString: any
	



	constructor( port: string, React: any, ReactDom: any ) {

		this.port = port;
		this.handlers = new Map()
		this.public_path = null;
		this.routes_path = null;
		this.createElement = React.createElement;
		this.renderToString = ReactDom.renderToString;
		this.client();

	}


	get( url: string, fn: () => void ) {

		this.handlers.set(url, fn)

	}

	public( path: string ) {

		this.public_path = path;

	}

	async routes( routes_directory_path: string ) {

		this.routes_path = routes_directory_path;

		const files = await readdir(routes_directory_path);

		console.log("ROUTES")

		for(const file of files) {


			const ext = path.extname(file);
			const name = path.basename(file, ext);

			(async () => {
				try {
					const module = await import(path.join(process.cwd(), path.join(routes_directory_path, file)))
					if(name == "index") {
						this.handlers.set("/", async () => {
							return new Response(this.renderToString(this.createElement(module.default)), {
								headers: {
									'Content-type': "text/html; charset=utf-8"
								}
							})
						})
					} else {
						this.handlers.set(path.join("/", name.toLowerCase()), async () => {
							return new Response(this.renderToString(this.createElement(module.default)), {
								headers: {
									'Content-type': "text/html; charset=utf-8"
								}
							})
						})
					}
				} catch {

				}
			})()


		}

	} 

	async client() {

		const dir_path = "./routes"

		const files = await readdir("./routes");

		const imports = ['./client.jsx']

		for(const file of files) {

			const path_to_file = path.join(dir_path, file)

			const stat = await lstat(path_to_file)

			if(stat.isFile()) {

				imports.push(path_to_file)

			}

		}

		await Bun.build({
			entrypoints: imports,
			outdir: './public',
		});

	}


	listen() {

		const self = this


		Bun.serve({
			port: this.port,
			fetch(req) {

				if(new URL(req.url).pathname.split("/")[1] == "public") {
					return new Response(Bun.file("." + new URL(req.url).pathname))
				} 

				for(const [pathname, handler] of self.handlers.entries()) {

					if(pathname == new URL(req.url).pathname) {
						return handler() 
					}

				}

				return new Response("Bun!");
			},
		});

	}
}



