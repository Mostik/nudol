import { Nudol } from "../index.ts"

export function start( nudol: Nudol ) {
	console.log(`Listen ${nudol.hostname}:${nudol.port} [${[...nudol.handlers.keys()].length}]` )

	for( var handler of nudol.handlers.keys() ) {
		console.log('\x1b[34m%s\x1b[0m', `[${handler.method}]\t`, handler.hydrationpath ? "[h]\t" : "\t",  `${handler.path}`,  )
	}

	if( nudol.websocket ) {
		console.log(nudol.websocket)

	}
}
