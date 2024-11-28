import { Nudol } from "../index.ts"
import { readdir, mkdir, exists } from "node:fs/promises";
import path from "node:path" 
import { Method } from "./method.ts";
import { generateRoute } from "./routes.ts";

import { createElement } from "react"
import { renderToString } from "react-dom/server"
import type { BuildOutput } from "bun";

export function hydrationScript( this: Nudol, hydrationpath: string|null ) {

	if( hydrationpath ) {
		let file_path = (this.url!.pathname)?.toLowerCase()
		
		if(this.url!.pathname == "/") {

			file_path = "index"

		}

		return createElement("script", { type: "module", src: path.join( hydrationpath ), defer: 'defer' })
	}

}

async function findDocumentFile( routes_path : any ) {
	let doc_module = undefined;

	const files = await readdir( routes_path )


	for (const file of files) {

		const { name, ext } = path.parse(file)

		if(name == "_document") {
			[".js", ".ts", ".jsx", ".tsx"].includes(ext)
			doc_module = await import(path.join(process.cwd(), path.join(routes_path!, ("_document" + ext))))
		}

	}

	return doc_module
}


function SSRPrepare( this: Nudol, doc_module: any, module: any, hydrationpath: string|null ) {
	return createElement(
		doc_module.default,
		{ hydrationScript: this.hydrationScript.bind(this, hydrationpath!) },
		createElement( module.default )
	)
 
} 


function SSR( this: Nudol,  doc_module: any, module: any, hydrationpath: string|null ) {
	let result = undefined;

	if( doc_module ) {
		result = (SSRPrepare.bind( this ))( doc_module, module, hydrationpath )
	} else {
		result = createElement( module.default )
	}

	return new Response( renderToString(result), {
		headers: {
			'Content-Type': "text/html; charset=utf-8",
		}
	})

}


async function HydrationToTemp( this: Nudol, build_file: any, component_file: any ): void {

	await Bun.write( Bun.file( build_file ),
		`
			import { hydrateRoot } from "react-dom/client"\n
			import HydrationComponent from "${component_file}"\n
			hydrateRoot(document.getElementById('root'), <HydrationComponent></HydrationComponent>)\n
		`
	)

}

async function HydrationBuild( this: Nudol, build_file: any ): Promise<BuildOutput> {

	return await Bun.build({
		entrypoints: [ build_file ],
		format: "esm",
		minify: this.config.production, 
		naming: '[hash].[ext]',
		sourcemap: this.config.production ? "none" : "inline",
	});


}

function HydrationToStatic( this: Nudol, static_path: string, result: any, params: any) {


	this.static_routes[ static_path ] = new Response( result.outputs[0], { 
		headers: { 
			"Content-Type" : "text/javascript;charset=utf-8", 
			...params.headers
		}
	} )


}

export interface RoutesParams {
	headers?: any,
}

export async function fsRoutes(this: Nudol, routes_directory_path: string, params: RoutesParams = { headers: {} } ) {

	if(!(await exists( path.join( process.cwd(), this.temp_path)))) {
		await mkdir( path.join( process.cwd(), this.temp_path) )
	}

	this.routes_path = routes_directory_path;

	const files = await readdir( this.routes_path, { recursive: true, withFileTypes: true } )

	const doc_module = await findDocumentFile( this.routes_path )

	for( const file of files ) {

		if ( file.isFile() ) {

			const full_path = path.join(file.parentPath, path.parse( file.name).name )

			const file_path = path.join( ...full_path.split(path.sep).slice(path.join(this.routes_path).split(path.sep).length, full_path.split(path.sep).length ) )

			const component_file = path.join( process.cwd(), this.routes_path!, file_path)

			const { dir, name } = path.parse( file_path ) 

			const build_path = path.join( process.cwd(), this.temp_path, dir, name ) 
			const build_file = path.join( build_path + ".tsx" ) 

			HydrationToTemp.bind(this)( build_file, component_file )

			const result = await HydrationBuild.bind(this)( build_file )

			if(!result.success) {
				console.log(result.logs)
				throw new Error("client error")
			} 

			const static_path = path.join("/", this.temp_path, result.outputs[0].path ).replaceAll("\\", "/")

			HydrationToStatic.bind(this)( static_path, result, params )

			try {
				const import_path = path.join(process.cwd(), file.parentPath, file.name)
				const module = await import(import_path)

				const {name} = path.parse( file.name )

				if (name == "_document") {
				} else if(name == "index") {

					this.handlers.set(generateRoute(Method.GET, "/", static_path), async () => {
						return (SSR.bind(this))(doc_module, module, static_path)
					})

				} else {
					this.handlers.set(generateRoute(Method.GET, path.join( "/", file_path).replaceAll("\\", "/"), static_path), async () => {
						return (SSR.bind(this))(doc_module, module, static_path)
					})
				}
			} catch (error) {

				console.log("Error import file", error)

			}

		}
	}

} 
