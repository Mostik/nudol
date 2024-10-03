import type { Nudol } from ".."
import path from "node:path" 

export function script( this: Nudol, hydrationpath: string|null ) {

	if( hydrationpath ) {
		let file_path = (this.url!.pathname)?.toLowerCase()
		
		if(this.url!.pathname == "/") {

			file_path = "index"

		}

		return this.createElement("script", { type: "module", src: path.join( hydrationpath ), defer: 'defer' })
	}

}
