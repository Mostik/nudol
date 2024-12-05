import { Nudol } from "../index.ts"
import { expect, test } from "bun:test";
import { Method } from "../src/method.ts";

test("minimal", () => {

	const nudol = Nudol()

	expect( typeof nudol ).toBe("object");
	expect( nudol.config.port ).toBe(3000);	
	expect( nudol.config.hostname ).toBe("0.0.0.0");	

})

test("init", () => {

	const nudol = Nudol( { port: "11230", hostname: "127.0.0.1", logs: false } )

	expect( typeof nudol ).toBe("object");
	expect( nudol.config.port ).toBe("11230");	
	expect( nudol.config.hostname ).toBe("127.0.0.1");	

});

test("init port number", () => {

	const nudol = Nudol( { port: 11240, hostname: "127.0.0.1", logs: false } )

	expect( typeof nudol ).toBe("object");
	expect( nudol.config.port ).toBe(11240);	
	expect( nudol.config.hostname ).toBe("127.0.0.1");	

});

test("get", async () => {

	const nudol = Nudol( { port: "11231", hostname: "127.0.0.1", logs: false } )

	nudol.get("/", function () {

		return new Response("hello")
	});

	nudol.listen()

	expect(await (await fetch("http://127.0.0.1:11231")).text()).toBe("hello")

	nudol.server!.stop();

});

test("post", async () => {

	const nudol = Nudol( { port: "11232", hostname: "127.0.0.1", logs: false } )

	nudol.post("/post", function () {

		return new Response("post")
	});

	nudol.listen()

	expect(await (await fetch("http://127.0.0.1:11232/post", { method: "POST" })).text()).toBe("post")

	nudol.server!.stop();

});


test("regexp", async () => {

	const nudol = Nudol( { port: "11233", hostname: "127.0.0.1", logs: false } )

	nudol.get("/", function () {
		return new Response("yes main")
	});

	nudol.get("/name", function () {
		return new Response("name")
	});

	nudol.get("/user/{userid}", function () {
		return new Response("id")
	});

	nudol.get("/user/{userid}/profile", function () {
		return new Response("profile")
	});

	nudol.get("/user/{userid}/profile/{commentId}", function () {
		return new Response("user profile comment id")
	});

	nudol.listen()

	expect(await (await fetch("http://127.0.0.1:11233/name")).text()).toBe("name")
	expect(await (await fetch("http://127.0.0.1:11233/user/3942993")).text()).toBe("id")
	expect(await (await fetch("http://127.0.0.1:11233/user/myid/profile")).text()).toBe("profile")
	expect(await (await fetch("http://127.0.0.1:11233/user/334/profile")).text()).toBe("profile")
	expect(await (await fetch("http://127.0.0.1:11233/user/_39_/profile")).text()).toBe("profile")
	expect(await (await fetch("http://127.0.0.1:11233/user/myuser/profile/7")).text()).toBe("user profile comment id")
	expect(await (await fetch("http://127.0.0.1:11233/user/999/profile/7/reply")).text()).toBe("404 Not found")
	expect(await (await fetch("http://127.0.0.1:11233/email")).text()).toBe("404 Not found")
	expect(await (await fetch("http://127.0.0.1:11233/hahah/eoeoe/d02n")).text()).toBe("404 Not found")
	expect(await (await fetch("http://127.0.0.1:11233/ha/d/d/hah/eoeoe/d02n")).text()).toBe("404 Not found")

});


test("notfound", async () => {

	const nudol = Nudol( { port: "11234", hostname: "127.0.0.1", logs: false } )

	nudol.notfound( [ Method.GET ], function () {
		return new Response("My not found")
	})

	nudol.listen()

	expect(await (await fetch("http://127.0.0.1:11234/get", { method: "GET" })).text()).toBe("My not found")
	expect(await (await fetch("http://127.0.0.1:11234/post", { method: "POST" })).text()).toBe("404 Not found")

	nudol.server!.stop();

});

test("params", async () => {

	const nudol = Nudol( { port: "11238", hostname: "127.0.0.1", logs: false } )

	nudol.get("/user/@{username}", function ( ctx ) {

		return new Response(`Hello ${ctx.params.username}`)
	});

	nudol.get("/user/{username}", function ( ctx ) {

		return new Response(`Hello ${ctx.params.username}`)
	});



	nudol.listen()

	expect(await (await fetch("http://127.0.0.1:11238/user/dave")).text()).toBe("Hello dave")
	expect(await (await fetch("http://127.0.0.1:11238/user/7382")).text()).toBe("Hello 7382")
	expect(await (await fetch("http://127.0.0.1:11238/user/*&^$(")).text()).toBe("Hello *&^$(")
	expect(await (await fetch("http://127.0.0.1:11238/user/@steve")).text()).toBe("Hello steve")

	nudol.server!.stop();

});



//ws 
//production
