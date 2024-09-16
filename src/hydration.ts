import type { Nudol } from ".."
import { readdir, mkdir, exists } from "node:fs/promises";
import path from "node:path" 
import { parseRoute } from "./routes";
import { Method } from "./method";

export function script( this: Nudol) {

	console.log("Hello", this.handler )

	let file_path = (this.url!.pathname)?.toLowerCase()

	console.log(file_path)
	
	if(this.url!.pathname == "/") {

		file_path = "index"

	}

	return this.createElement("script", { type: "module", src: path.join( "/", this.temp_path, `${file_path}.js`), defer: 'defer' })

}

export async function build( this: Nudol ) {
	const files = await readdir( this.routes_path!, { recursive: true, withFileTypes: true } )

	if(!(await exists( path.join( process.cwd(), this.temp_path)))) {
		await mkdir( path.join( process.cwd(), this.temp_path) )
	}

	const entrypoints: string[] = [];

	for( const file of files ) {

		if ( file.isFile() ) {

			const full_path = path.join(file.parentPath, path.parse( file.name).name )

			const file_path = path.join( ...full_path.split("/").slice(1, full_path.split("/").length ) )


			const component_file = path.join( process.cwd(), this.routes_path!, file_path + ".tsx")
			const build_path = path.join( process.cwd(), this.temp_path, file_path ) 
			const build_file = path.join( build_path + ".tsx" ) 



			Bun.write(build_file,
				`
					import { hydrateRoot } from "react-dom/client"\n
					import HydrationComponent from "${component_file}"\n
					hydrateRoot(document.getElementById('root'), <HydrationComponent></HydrationComponent>)\n
				`
			)

			entrypoints.push( build_file )

		}
	}


	const result = await Bun.build({
		entrypoints: entrypoints,
		format: "esm",
	});


	for (const res of result.outputs) {
		const res_path =  path.join( this.temp_path, res.path)
		Bun.write(res_path, res);

		console.log(parseRoute( Method.GET, res_path ))

		this.handlers.set( parseRoute( Method.GET, path.join("/", res_path) ), function () {
			return new Response(Bun.file( res_path ))
		})

	}

	console.log( this.handlers)
	
	if(!result.success) {
		console.log(result.logs)
		throw new Error("client error")
	} 

}
