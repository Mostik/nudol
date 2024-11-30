import { Nudol } from "../index.ts"
import { readdir, mkdir, exists } from "node:fs/promises";
import path from "node:path" 
import { Method } from "./method.ts";
import { generateHandler, type Context, type Handler } from "./routes.ts";

import { createElement } from "react"
import { renderToString } from "react-dom/server"
import type { BuildOutput } from "bun";
import * as Log from "./logs.ts";

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


async function SSRPrepare( this: Nudol, module: any, doc_module: any, static_path: any, ctx: Context  ) {

	return createElement(
		doc_module.default,
		{ hydrationScript: this.hydrationScript.bind(this, static_path!) },
		createElement( module.default, ctx.params )
	)

} 


async function SSR( this: Nudol, module: any, doc_module: any, static_path: string, ctx: Context ) {
	let result = undefined;

	if( doc_module ) {
		result = await SSRPrepare.bind( this )( module, doc_module, static_path, ctx )
	} else {

		// if loadData
		// result = createElement( builder.module.default, { ...ctx.params, ...await module.loadData() } )
		
		result = createElement( module.default, ctx.params )
	}

	return new Response( renderToString(result), {
		headers: {
			'Content-Type': "text/html; charset=utf-8",
		}
	})

}


async function tempStatic( this: Nudol, builder: Builder ): Promise<void> {

	const component_file = path.join( process.cwd(), builder.root, builder.dir!, builder.name! )

	if( builder.module.loadData ) {
		await Bun.write( Bun.file( builder.temp! ),
		`
			import { createRoot, createElement } from "react-dom/client"
			import HydrationComponent from "${component_file}"

			// window.location.pathname
			//
			// if()

			createRoot(document.getElementById('root')).render( createElement(HydrationComponent, {}))
		`
		)
	} else {
		await Bun.write( Bun.file( builder.temp! ),
		`
			import { createRoot } from "react-dom/client"
			import HydrationComponent from "${component_file}"
			createRoot(document.getElementById('root')).render(<HydrationComponent></HydrationComponent>)
		`
		)
	}

}

async function buildStatic( this: Nudol, build_file: any ): Promise<BuildOutput> {

	return await Bun.build({
		entrypoints: [ build_file ],
		format: "esm",
		minify: this.config.production, 
		naming: '[hash].[ext]',
		sourcemap: this.config.production ? "none" : "inline",
	});


}

function generateStatic( this: Nudol, builder: Builder, result: BuildOutput, params: RoutesParams ) {

	this.static_routes[ builder.static! ] = new Response( result.outputs[0], { 
		headers: { 
			"Content-Type" : "text/javascript;charset=utf-8", 
			...params.headers
		}
	} )

}

function generatePath( this: Nudol, builder: Builder ) {

	if (builder.stem == "_document") {
	} else if(builder.stem  == "index") {

		return "/"

	} else {

		return path.join( "/", builder.dir!, builder.stem! ).replaceAll("\\", "/")
		
	}

	return undefined

}

export interface RoutesParams {
	headers?: any,
}


interface Builder {
	root: string,     // fsRoutes root dir "./routes" e.g
	doc_module?: any, // _document file if exists
	module?: any,     // module from file
	name?: string,    // name of file with ext
	stem?: string,    // name of file without ext
	dir?: string,     // dir of file
	temp?: string,    // file location in .temp folder
	static?: string,  // hydration static path for handlers
	path?: string, 	  // handler path 
	handler?: Handler,
}

export async function fsRoutes(this: Nudol, routes_directory_path: string, params: RoutesParams = { headers: {} } ) {

	if(!(await exists( path.join( process.cwd(), this.temp_path)))) {
		await mkdir( path.join( process.cwd(), this.temp_path) )
	}

	const builder: Builder = {
		root: routes_directory_path,
		doc_module: await findDocumentFile( routes_directory_path ) 
	} 

	const files = await readdir( builder.root, { recursive: true, withFileTypes: true } )

	for( const file of files ) {

		if ( !file.isFile() ) continue; 

		builder.name   = file.name;
		builder.stem   = path.parse( file.name ).name
		builder.dir    = path.relative( builder.root, file.parentPath);
		builder.temp   = path.join( process.cwd(), this.temp_path, builder.dir, builder.name ) 
		builder.module = await import( path.join(process.cwd(), file.parentPath, file.name) )

		tempStatic.bind( this )( builder )

		const result = await buildStatic.bind(this)( builder.temp )

		Log.buildError( result )

		builder.static = path.join("/", this.temp_path, result.outputs[0].path ).replaceAll("\\", "/")

		generateStatic.bind(this)( builder, result, params )

		builder.path = generatePath.bind(this)( builder )



		if( !builder.path ) continue; 
		if( !builder.module.default ) continue;

		builder.handler = generateHandler(Method.GET, builder.path!, builder.static)

		const module = builder.module
		const doc_module = builder.doc_module
		const static_path = builder.static

		this.handlers.set( builder.handler, async ( ctx: Context ) => {
			return await (SSR.bind(this))( module, doc_module, static_path!, ctx )
		})

	}

} 

