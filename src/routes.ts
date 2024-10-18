import { type Handler, type PathVariable, type PathPart, Nudol } from "../index.ts"
import _ from "lodash"
import { readdir, mkdir, exists } from "node:fs/promises";
import path from "node:path" 
import { Method } from "./method.ts";

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
	hydrationpath?: string,
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


export async function routes(this: Nudol, routes_directory_path: string, params: { headers: any } = { headers: {} } ) {

	const ssr_response = ( doc_module: any, element: any, hydrationpath: string|null ) => {

		const resp = (doc_module) ?
				this.createElement(
					doc_module.default,
					{ hydrationScript: this.hydrationScript.bind(this), hydrationpath: hydrationpath  },
					this.createElement(element)
				)
				:
				this.createElement(element)

		return new Response( this.renderToString(resp), {
			headers: {
				'Content-Type': "text/html; charset=utf-8",
			}
		})

	} 

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

			await Bun.write( Bun.file( build_file ),
				`
					import { hydrateRoot } from "react-dom/client"\n
					import HydrationComponent from "${component_file}"\n
					hydrateRoot(document.getElementById('root'), <HydrationComponent></HydrationComponent>)\n
				`
			)

			const result = await Bun.build({
				entrypoints: [ build_file ],
				format: "esm",
				minify: this.production, 
				naming: '[hash].[ext]',
			});

			if(!result.success) {
				console.log(result.logs)
				throw new Error("client error")
			} 

			const static_path = path.join("/", this.temp_path, result.outputs[0].path )

			this.static_routes[ static_path ] = new Response( result.outputs[0], { 
				headers: { 
					"Content-Type" : "text/javascript;charset=utf-8", 
					...params.headers
				}
			} )

			try {
				const import_path = path.join(process.cwd(), file.parentPath, file.name)
				const module = await import(import_path)

				const {name} = path.parse( file.name )

				if (name == "_document") {
				} else if(name == "index") {
					this.handlers.set(parseRoute(Method.GET, "/", static_path), async () => {
						return ssr_response(doc_module, module.default, static_path)
					})
				} else {
					this.handlers.set(parseRoute(Method.GET, path.join( "/", file_path).replaceAll("\\", "/"), static_path), async () => {
						return ssr_response(doc_module, module.default, static_path)
					})
				}
			} catch (error) {

				console.log("Error import file", error)

			}

		}
	}

} 


export function parseRoute( method: string, route_path: string, hydratioinpath: string|null = null ): Handler {

	const parts: PathPart[] = route_path.split("/").map((e, index) => ({ id: index, value: e }))

	let variables: PathVariable[] = []

	for(const part of parts) {

		if(part.value[0] == "{" && part.value.slice(-1)[0] == "}") {

			const name = part.value.slice(1, part.value.length - 1 )

			variables.push({id: part.id, name: name} as PathVariable)

		}

	}

	return { method: method, path: route_path, parts: parts, variables: variables, hydratioinpath: hydratioinpath } as Handler

}

export function parseRequest(request: Request): Handler {

	const url = new URL(request.url)

	const pathname = url.pathname

	const parts: PathPart[] = pathname.split("/").map((e, index) => ({ id: index, value: e }))

	return { method: request.method, path: pathname, parts: parts, variables: [] } as Handler

} 

export function routeValue(this: Nudol,  name: string) {

	return _.find(this.handler.variables, { name: name }).value

}

export function routeParam(this: Nudol, name: string): string|null {

	const params = this.url.searchParams

	return params.get(name)

}
