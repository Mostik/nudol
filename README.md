# Nudol
 Extremely slow, сlumsy, cringe framework for combat helicopters

 Focus on debugging this library rather than debugging your own application.
## Quick Start
```
bun add @nudol/core
```
## Features
* Fragile routing 
* Type Unsafety (all is any)
* Super-high memory usage (possible memory leaks)
* Terrible API
* Second-class TypeScript support. (use js)
* Breaking changes every day
* No backward compatibility
* Doesn't work on any Runtime: **Node.js**, **Deno**, **Cloudflare Workers**, **Vercel**, **AWS Lambda**...


## Examples

#### init 
```js
import { Nudol } from "@nudol/core"

const nudol = Nudol()

nudol.listen()
```

#### create route 
```js
import { Nudol } from "@nudol/core"

const nudol = Nudol()

nudol.get("/", () => {
  return new Response("Hello world")
})

nudol.listen()
```

#### route variables 
```js
import { Nudol } from "@nudol/core"

const nudol = Nudol()

nudol.get("/user/{username}", (ctx) => {

  return new Response(`Hello ${ctx.params.username}`)
})

nudol.listen()
```

#### react routes 
```
bun add @nudol/core react react-dom
```


```js
// routes/index.tsx

export default function() {

  return (
    <h1>Index page</h1>
  )

}

// index.ts
import { Nudol } from "@nudol/core"

const nudol = Nudol( { port: 3000, hostname: "127.0.0.1" } )

await nudol.fsRoutes( "./routes" )

nudol.listen()
```


#### full api
```js
import { Nudol } from "@nudol/core"

const nudol = Nudol( { port: 3000, hostname: "127.0.0.1" } )

await nudol.fsStatic( "./static" )

await nudol.fsRoutes( "./routes" )

nudol.get("/api/get", () => {

  return new Response("get")
})

nudol.post("/api/post", () => {

  return new Response("post")
})

nudol.notfound([Method.GET, Method.POST], () => {
  return new Response("There's nothing here")
})

nudol.listen()
```

#### tailwind for "bun --watch"
```js
import { Nudol } from "@nudol/core"

import { $ } from "bun"
await $`bunx --bun tailwindcss -i ./static/index.css -o ./static/output.css --minify`.quiet()

const nudol = Nudol()

await nudol.fsStatic("./static")
await nudol.fsRoutes("./routes")

nudol.listen()
```
## Documentation
Never...
