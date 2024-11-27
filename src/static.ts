import { Nudol } from "../index.ts"
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path"

export async function fsStatic(this: Nudol, path: string, alias: string = "static" ) {

	const files = await readdir( path, { recursive: true, withFileTypes: true } )

	for( let file of files ) {

		if( file.isFile() ) {

			const file_path = join( file.parentPath, file.name )
			const file_route = join( "/", alias, relative( path, file_path ) ).replaceAll("\\", "/")

			this.static_routes[ file_route ] = new Response( await Bun.file( file_path ).bytes(), {
				headers: new Response(Bun.file( file_path )).headers
			})

		}

	}

}

