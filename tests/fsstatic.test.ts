import { Nudol } from "../index.ts"
import { expect, test, not } from "bun:test";

test("static", async () => {

	const nudol = Nudol( { port: "11236", hostname: "127.0.0.1" } )

	await nudol.fsStatic( "./tests/test_static" )

	nudol.listen();

	expect(await (await fetch("http://127.0.0.1:11236/static/output.css")).text()).toBe(await Bun.file("./tests/test_static/output.css").text())
	expect(JSON.stringify(await (await fetch("http://127.0.0.1:11236/static/images/logo.png")).bytes())).toBe(JSON.stringify( await (await Bun.file("./tests/test_static/images/logo.png")).bytes()))
	expect(JSON.stringify(await (await fetch("http://127.0.0.1:11236/static/images/logo.svg")).bytes())).toBe(JSON.stringify( await (await Bun.file("./tests/test_static/images/logo.svg")).bytes()))
	expect(JSON.stringify(await (await fetch("http://127.0.0.1:11236/static/images/logo.svg")).bytes())).not.toBe(JSON.stringify( await (await Bun.file("./tests/test_static/images/logo.png")).bytes()))

});

