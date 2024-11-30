import { Nudol } from "../index.ts"
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server" 
import Taylor from "./test_routes/names/taylor.tsx";

test("fs init", async () => {

	const nudol = Nudol( { port: "11235", hostname: "127.0.0.1", logs: false } )

	await nudol.fsRoutes( "./tests/test_routes" )

	nudol.listen();

	expect(await (await fetch("http://127.0.0.1:11235/")).text()).toBe(renderToString(<div>index</div>))
	expect(await (await fetch("http://127.0.0.1:11235/ggwp")).text()).toBe(renderToString(<h1>ggwp</h1>))
	expect(await (await fetch("http://127.0.0.1:11235/names/alex")).text()).not.toBe(renderToString(<div><span>Dave</span></div>))
	expect(await (await fetch("http://127.0.0.1:11235/names/dave")).text()).toBe(renderToString(<div><span>Dave</span></div>))
	expect(await (await fetch("http://127.0.0.1:11235/names/taylor")).text()).toBe(renderToString(<Taylor/>))

});

