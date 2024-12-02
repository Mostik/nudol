import { Nudol } from "../index.ts"
import { expect, test, not } from "bun:test";

test("static", async () => {

	const nudol = Nudol( { port: "11236", hostname: "127.0.0.1", logs: false } )

	await nudol.fsStatic( "./tests/test_static" )

	nudol.listen();

	expect(await (await fetch("http://127.0.0.1:11236/static/output.css")).text()).toBe(await Bun.file("./tests/test_static/output.css").text())
	expect(JSON.stringify(await (await fetch("http://127.0.0.1:11236/static/images/logo.png")).bytes())).toBe(JSON.stringify( await (await Bun.file("./tests/test_static/images/logo.png")).bytes()))
	expect(JSON.stringify(await (await fetch("http://127.0.0.1:11236/static/images/logo.svg")).bytes())).toBe(JSON.stringify( await (await Bun.file("./tests/test_static/images/logo.svg")).bytes()))
	expect(JSON.stringify(await (await fetch("http://127.0.0.1:11236/static/images/logo.svg")).bytes())).not.toBe(JSON.stringify( await (await Bun.file("./tests/test_static/images/logo.png")).bytes()))

});

test("static alias", async () => {

	const nudol = Nudol( { port: "11246", hostname: "127.0.0.1", logs: false } )

	await nudol.fsStatic( "./tests/test_static", { alias: "somepath" } )

	nudol.listen();

	expect(await (await fetch("http://127.0.0.1:11246/static/output.css")).text()).not.toBe(await Bun.file("./tests/test_static/output.css").text())
	expect(JSON.stringify(await (await fetch("http://127.0.0.1:11246/static/images/logo.png")).bytes())).not.toBe(JSON.stringify( await (await Bun.file("./tests/test_static/images/logo.png")).bytes()))
	expect(JSON.stringify(await (await fetch("http://127.0.0.1:11246/static/images/logo.svg")).bytes())).not.toBe(JSON.stringify( await (await Bun.file("./tests/test_static/images/logo.svg")).bytes()))

	expect(await (await fetch("http://127.0.0.1:11246/somepath/output.css")).text()).toBe(await Bun.file("./tests/test_static/output.css").text())
	expect(JSON.stringify(await (await fetch("http://127.0.0.1:11246/somepath/images/logo.png")).bytes())).toBe(JSON.stringify( await (await Bun.file("./tests/test_static/images/logo.png")).bytes()))
	expect(JSON.stringify(await (await fetch("http://127.0.0.1:11246/somepath/images/logo.svg")).bytes())).toBe(JSON.stringify( await (await Bun.file("./tests/test_static/images/logo.svg")).bytes()))
	expect(JSON.stringify(await (await fetch("http://127.0.0.1:11246/somepath/images/logo.svg")).bytes())).not.toBe(JSON.stringify( await (await Bun.file("./tests/test_static/images/logo.png")).bytes()))

});


test("static options", async () => {

	function someOptionsFromFunction() {

		return {}

	}

	const nudol = Nudol( { port: "11247", hostname: "127.0.0.1", logs: false } )

	await nudol.fsStatic( "./tests/test_static", someOptionsFromFunction() )

	nudol.listen();

	expect(await (await fetch("http://127.0.0.1:11236/static/output.css")).text()).toBe(await Bun.file("./tests/test_static/output.css").text())
	expect(JSON.stringify(await (await fetch("http://127.0.0.1:11236/static/images/logo.png")).bytes())).toBe(JSON.stringify( await (await Bun.file("./tests/test_static/images/logo.png")).bytes()))
	expect(JSON.stringify(await (await fetch("http://127.0.0.1:11236/static/images/logo.svg")).bytes())).toBe(JSON.stringify( await (await Bun.file("./tests/test_static/images/logo.svg")).bytes()))
	expect(JSON.stringify(await (await fetch("http://127.0.0.1:11236/static/images/logo.svg")).bytes())).not.toBe(JSON.stringify( await (await Bun.file("./tests/test_static/images/logo.png")).bytes()))


});
