import type { Nudol } from ".."
import { parseRoute } from "./routes"

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

export function get( this: Nudol, path: string, fn: (request: Request) => void ) {

	this.handlers.set(parseRoute(Method.GET, path), fn)

}

export function post( this: Nudol, path: string, fn: (request: Request) => void ) {

	this.handlers.set(parseRoute(Method.POST, path), fn)

}

