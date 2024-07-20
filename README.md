# Nudol
 Extremely slow, сlumsy, cringe framework for combat helicopters

 Focus on debugging this library rather than debugging your own application.
## Quick Start
```
npm create ... i was joking, git clone to node_modules
```
## Features
* Fragile routing 
* Type Usafety (all is any)
* Super-high memory usage (possible memory leaks)
* Terrible API
* Third-class TypeScript support. (use js plz)
* Doesn't work on any Runtime: **Node.js**, **Deno**, **Cloudflare Workers**, **Vercel**, **AWS Lambda**...

## Example
```js
import { Nudol } from "nudol"
import React from "react"
import ReactDom from "react-dom/server"

const nudol = new Nudol("8083", React, ReactDom)

nudol.get("/", () => {
  return new Response("Hello world")
})

nudol.listen()
```
## Documentation
Never...
