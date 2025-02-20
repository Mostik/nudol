import type { BuildOutput } from "bun"
import { Nudol } from "../index.ts"

export function start( nudol: Nudol ) {
	console.log(`Listen ${nudol.config.hostname}:${nudol.config.port} R[${[...nudol.handlers.keys()].length}] S[${Object.keys(nudol.static_routes).length}]` )

	for( let handler of nudol.handlers.keys() ) {
		console.log('\x1b[34m%s\x1b[0m', `[${handler.method}]\t\t`,  `${handler.path}`, handler.hydrationpath ? "[h]\t" : "" )
	}

	for( let route of Object.keys(nudol.static_routes) ) {
		console.log(`\x1b[33m[STATIC]\t\x1b[0m ${route}` )
	}

	if( nudol.websocket ) {
		console.log(nudol.websocket)
	}

}


export function buildError( result: BuildOutput ) {
	if(!result.success) {
		console.log(result.logs)
		throw new Error("client error")
	} 
}
