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


export async function routes(this: Nudol, routes_directory_path: string ) {

	const ssr_response = ( doc_module: any, element: any ) => {
		const resp = (doc_module) ?
				this.createElement(
					doc_module.default,
					{ hydrationScript: this.hydrationScript.bind(this) },
					this.createElement(element)
				)
				:
				this.createElement(element)

		return new Response( this.renderToString(resp), {
			headers: {
				'Content-type': "text/html; charset=utf-8"
			}
		})

	} 


	this.routes_path = routes_directory_path;

	const files = await readdir( this.routes_path, { recursive: true, withFileTypes: true } )

	const doc_module = await findDocumentFile( this.routes_path )

	for( const file of files ) {

		if ( file.isFile() ) {

			const full_path = path.join(file.parentPath, path.parse( file.name).name )

			const file_path = path.join( ...full_path.split("/").slice(1, full_path.split("/").length ) )

			console.log(file_path)
			
			try {
				const import_path = path.join(process.cwd(), file.parentPath, file.name)
				const module = await import(import_path)

				if (file.name == "_document") {
				} else if(file.name == "index") {
					this.handlers.set(parseRoute(Method.GET, "/"), async () => {
						return ssr_response(doc_module, module.default)
					})
				} else {
					this.handlers.set(parseRoute(Method.GET, path.join( "/", file_path)), async () => {
						return ssr_response(doc_module, module.default)
					})
				}
			} catch (error) {

				console.log("Error import file", error)

			}

		}
	}

} 


export function parseRoute(method: string, path: string): Handler {

	const parts: PathPart[] = path.split("/").map((e, index) => ({ id: index, value: e }))

	let variables: PathVariable[] = []

	for(const part of parts) {

		if(part.value[0] == "{" && part.value.slice(-1)[0] == "}") {

			const name = part.value.slice(1, part.length - 1 )

			variables.push({id: part.id, name: name} as PathVariable)

		}

	}

	return { method: method, path: path, parts: parts, variables: variables } as Handler

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
