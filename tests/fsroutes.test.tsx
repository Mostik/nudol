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



test("fs default props (server)", async () => {
	const nudol = Nudol( { port: "11237", hostname: "127.0.0.1", logs: false } )

	await nudol.fsRoutes( "./tests/test_routes_props" )

	nudol.listen();

	expect(await (await fetch("http://127.0.0.1:11237/")).text()).toBe(renderToString("404 Not found"))
	expect(await (await fetch("http://127.0.0.1:11237/dave")).text()).toBe(renderToString(<div>dave</div>))
	expect(await (await fetch("http://127.0.0.1:11237/alex")).text()).toBe(renderToString(<div>alex</div>))
	expect(await (await fetch("http://127.0.0.1:11237/djdslk20dnsnl2l2l")).text()).toBe(renderToString(<div>djdslk20dnsnl2l2l</div>))
	expect(await (await fetch("http://127.0.0.1:11237/djdsl/k20dni/snl2l2l")).text()).toBe(renderToString("404 Not found"))

	expect(await (await fetch("http://127.0.0.1:11237/user/")).text()).toBe(renderToString("404 Not found"))
	expect(await (await fetch("http://127.0.0.1:11237/user/38200101")).text()).toBe("<h1>Your id: <!-- -->38200101</h1>")
	expect(await (await fetch("http://127.0.0.1:11237/user/7ff7baad-2cc2-4ab1-b04d-c5c0e56b4572")).text()).toBe("<h1>Your id: <!-- -->7ff7baad-2cc2-4ab1-b04d-c5c0e56b4572</h1>")
})

