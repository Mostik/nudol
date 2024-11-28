
export interface Handler {
	method: string,
	path: string,
	regexp: RegExp | string,
	params: object | undefined,
	hydrationpath?: string,
}


export function generateRoute( method: string, route_path: string, hydrationpath: string|undefined = undefined ): Handler {

	const regexp = "^" + (route_path.replaceAll(/\{(.+?)\}/gi, `(?<$1>[^\/]+)`)) + "$"

	return { 
		method: method,
		path: route_path,
		regexp: regexp,
		params: undefined,
		hydrationpath: hydrationpath,
	} as Handler

}


export interface Context {
	request: Request,
	params: any,
}


export function generateContext( req: Request, params: any ): Context {
	return {
		request: req,
		params: params,
	} as Context
}

