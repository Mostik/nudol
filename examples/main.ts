import { Nudol } from "../index.ts"

const nudol = Nudol( { port: "3000", hostname: "localhost"} ) 

await nudol.fsRoutes("./examples/example_routes", { headers: {} })

nudol.listen()
