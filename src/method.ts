import type { Nudol } from ".."
import { generateRoute } from "./routes"
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

	this.handlers.set(generateRoute(Method.GET, path), fn)

}

export function post( this: Nudol, path: string, fn: (request: Context) => void ) {

	this.handlers.set(generateRoute(Method.POST, path), fn)

}

