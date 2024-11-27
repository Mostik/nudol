import { Nudol } from "../index.ts" //"@nudol/core"

const nudol = Nudol()

nudol.get("/user/{username}", (ctx) => {

	return new Response(`Hello ${ctx.params.username}`)
})

nudol.listen()

