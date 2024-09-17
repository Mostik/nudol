import type { Nudol } from ".."
import { readdir, mkdir, exists } from "node:fs/promises";
import path from "node:path" 
import { parseRoute } from "./routes";
import { Method } from "./method";

export function script( this: Nudol) {

	let file_path = (this.url!.pathname)?.toLowerCase()
	
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

			const full_path = path.join(file.parentPath, file.name )

			const file_path = path.join( ...full_path.split("/").slice(path.join(this.routes_path).split("/").length, full_path.split("/").length ) )

			const component_file = path.join( process.cwd(), this.routes_path!, file_path)

			const { dir, name } = path.parse( file_path ) 

			const build_path = path.join( process.cwd(), this.temp_path, dir, name ) 
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

		let res_path = path.join( this.temp_path, res.path )


		if( res.path.split("/")[0] == this.temp_path ) {

			res_path = path.join( res.path ) 

		}

		Bun.write(res_path, res);
		
		const { name, dir, base } = path.parse( res.path )


		let route_path = path.join("/", this.temp_path, res.path ) 

		if( res.path.split("/")[0] == this.temp_path ) {

			route_path = path.join( "/", res.path ) 

		}


		if(name[0] == "{" && name.slice(-1)[0] == "}") {

			route_path = path.join("/", this.temp_path, dir, name) 

			if( res.path.split("/")[0] == this.temp_path ) {

				route_path = path.join("/", dir, name) 

			}

		}

		this.handlers.set( parseRoute( Method.GET, route_path  ), function () {
			return new Response(Bun.file( res_path ))
		})

	}
	
	if(!result.success) {
		console.log(result.logs)
		throw new Error("client error")
	} 

}
