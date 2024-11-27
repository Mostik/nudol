import { useEffect } from "react"

export default function() {

	useEffect( () => {
		console.log("index")
	}, [])

	return (
		<div>index page</div>
	)
}
