import { Nudol } from "../index.ts"
import { expect, test } from "bun:test";
import { createElement } from "react" 
import { renderToString } from "react-dom/server" 

test("fs init", async () => {

	const nudol = Nudol( { port: "11235", hostname: "127.0.0.1" } )

	await nudol.fsRoutes( "./tests/test_routes", { createElement, renderToString } )

	nudol.listen();

});

