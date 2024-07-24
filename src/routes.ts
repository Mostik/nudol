import { type Handler, type PathVariable, type PathPart } from "../index.ts"
import _ from "lodash"

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
