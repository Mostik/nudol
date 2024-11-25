import { Nudol } from "../index.ts"
import _ from "lodash"

export interface Handler {
	method: string,
	path: string,
	regexp: RegExp | string,
	params: object | undefined,
	hydrationpath?: string,
}


export function generateRoute( method: string, route_path: string, hydrationpath: string|null = null ): Handler {

	const regexp = "^" + (route_path.replaceAll(/\{(.+?)\}/gi, `(?<$1>[^\/]+)`)) + "$"

	return { 
		method: method,
		path: route_path,
		regexp: regexp,
		params: undefined,
		hydrationpath: hydrationpath,
	} as Handler

}

export function routeValue(this: Nudol, name: string) {

	return _.find(this.handler.params, { name: name }).value

}

export function routeParam(this: Nudol, name: string): string|null {

	const params = this.url.searchParams

	return params.get(name)

}
