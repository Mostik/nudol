import { sleep, sleepSync } from "bun"
import { Nudol } from "../index.ts"

const nudol = Nudol( { port: 3000, hostname: "localhost"} ) 

nudol.get( "/getUser", () => {
	return new Response(JSON.stringify( { name: "Jarred" } ))
})

await nudol.fsRoutes( "./examples/example_routes" )

nudol.listen()
