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

export async function routes(this: Nudol, routes_directory_path: string ) {

	this.routes_path = routes_directory_path;

	const read_path = path.join( this.routes_path )

	const files = await readdir( read_path );

	let doc = false 
	let doc_module = undefined;

	for (const file of files) {

		const { name, ext } = path.parse(file)

		if(name == "_document") {
			[".js", ".ts", ".jsx", ".tsx"].includes(ext)
			doc_module  = await import(path.join(process.cwd(), path.join(this.routes_path!, ("_document" + ext))))
			doc = true
		}

	}

	const ret_response = ( element: any ) => {

		const options = {
			headers: {
				'Content-type': "text/html; charset=utf-8"
			}
		}

		const resp = (doc) ?
			this.createElement(
				doc_module.default,
				{ hydrationScript: this.hydrationScript.bind(this) },
				this.createElement(element)
			)
			:
			this.createElement(element)

		return new Response( this.renderToString(resp), options)

	} 

	for(const file of files) {

		const { name, ext } = path.parse(file)

		try {
			const import_path = path.join(process.cwd(), this.routes_path!, file)
			const module = await import(import_path)

			if (name == "_document") {
			} else if(name == "index") {
				this.handlers.set(parseRoute(Method.GET, "/"), async () => {
					return ret_response(module.default)
				})
			} else {
				const handler_path = "/" + name.toLowerCase();
				this.handlers.set(parseRoute(Method.GET, handler_path), async () => {
					return ret_response(module.default)
				})
			}
		} catch (error) {

			console.log("Error import file", error)

		}

	}

} 


export function parseRoute(method: string, path: string): Handler {

	const parts: PathPart[] = path.split("/").map((e, index) => ({ id: index, value: e }))

	let variables: PathVariable[] = []

	for(const [id, part] of path.split("/").entries()) {

		if(part[0] == "{" && part.slice(-1)[0] == "}") {

			const name = part.slice(1, part.length - 1 )

			variables.push({id: id, name: name} as PathVariable)

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

export function routeValue(handler: Handler,  name: string) {

	return _.find(handler.variables, { name: name }).value

}

export function routeParam(url: URL, name: string): string|null {

	const params = url.searchParams

	return params.get(name)

}
