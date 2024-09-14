import type { Nudol } from ".."
import { readdir, mkdir, exists } from "node:fs/promises";
import path from "node:path" 

export function script( this: Nudol) {

	let file_path = (this.url!.pathname?.split("/")[1])?.toLowerCase()
	
	if(this.url!.pathname == "/") {

		file_path = "index"

	}

	return this.createElement("script", { type: "module", src: path.join( "./", this.temp_path, `${file_path}.js`), defer: 'defer' })

}

export async function build( this: Nudol ) {

		const files = await readdir(this.routes_path!);

		let component_path = ""; 
		let entrypoints: string[] = []

		for(const file of files) {

			component_path = path.join(process.cwd(), this.routes_path!, file)

			const genfilename = path.join(process.cwd(), this.temp_path, file.toLowerCase()) 

			entrypoints.push(genfilename)

			if(!(await exists( path.join( process.cwd(), this.temp_path)))) {
				await mkdir( path.join( process.cwd(), this.temp_path) )
			}

			Bun.write(genfilename,
				`
					import { hydrateRoot } from "react-dom/client"\n
					import HydrationComponent from "${component_path}"\n
					hydrateRoot(document.getElementById('root'), <HydrationComponent></HydrationComponent>)\n
				`
			)

		}

		
		let outdir = path.join( process.cwd(), this.temp_path )

		const result = await Bun.build({
			entrypoints: entrypoints,
			format: "esm",
		});

		for (const res of result.outputs) {
		  const {base} = path.parse(res.path)
		  Bun.write(path.join(outdir, base), res);
		}

		if(!result.success) {
			console.log(result.logs)
			throw new Error("client error")
		} 
	}

