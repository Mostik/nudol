import type { Nudol } from ".."
import { generateHandler } from "./routes"
import { type Context } from "./routes"

export enum Method {
	CONNECT = 'CONNECT',
	DELETE = 'DELETE',
	GET = 'GET',
	HEAD = 'HEAD',
	OPTIONS = 'OPTIONS',
	PATCH = 'PATCH',
	POST = 'POST',
	PUT = 'PUT',
	TRACE = 'TRACE',
}

export function get( this: Nudol, path: string, fn: (request: Context) => void ) {

	this.handlers.set(generateHandler(Method.GET, path), fn)

}

export function post( this: Nudol, path: string, fn: (request: Context) => void ) {

	this.handlers.set(generateHandler(Method.POST, path), fn)

}

//TODO: change api
export function notfound( this: Nudol, methods: Method[] , fn: (context: Context) => void ) {

	for(let method of methods) {
		this.handlers.set(generateHandler(method, "404"), fn)
	}

}

