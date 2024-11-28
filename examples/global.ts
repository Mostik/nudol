import { Nudol } from "../index"

const nudol = Nudol( { port: 3000, hostname: "127.0.0.1" } )

await nudol.fsStatic( "./examples/example_static" )
await nudol.fsRoutes( "./examples/example_routes" )


nudol.get("/api/get", () => {

  return new Response("get")
})

nudol.post("/api/post", () => {

  return new Response("post")
})

// nudol.notfound([Method.GET, Method.POST], () => {
//   return new Response("There's nothing here")
// })

nudol.listen()
