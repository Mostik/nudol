import { Nudol } from "../index.ts"
import { expect, test } from "bun:test";

test("init", () => {

	const nudol = Nudol( { port: "8080", hostname: "127.0.0.1" } )

	expect( typeof nudol ).toBe("object");
	expect( nudol.port ).toBe("8080");	
	expect( nudol.hostname ).toBe("127.0.0.1");	

});

test("get", async () => {

	const nudol = Nudol( { port: "8080", hostname: "127.0.0.1" } )

	nudol.get("/", function () {

		return new Response("hello")
	});

	nudol.listen()

	expect(await (await fetch("http://127.0.0.1:8080")).text()).toBe("hello")

});

test("post", async () => {

	const nudol = Nudol( { port: "8081", hostname: "127.0.0.1" } )

	nudol.post("/post", function () {

		return new Response("post")
	});

	nudol.listen()

	expect(await (await fetch("http://127.0.0.1:8081/post", { method: "POST" })).text()).toBe("post")

});



