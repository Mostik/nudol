import { sleep, sleepSync } from "bun"
import { Nudol } from "../index.ts"

const nudol = Nudol( { port: 3000, hostname: "localhost"} ) 

nudol.get( "/somedata", () => {
	return new Response("some data from server")
})

nudol.get( "/getUser", () => {
	return new Response(JSON.stringify( { name: "Jarred" } ))
})

await nudol.fsRoutes( "./examples/example_routes" )

nudol.listen()
