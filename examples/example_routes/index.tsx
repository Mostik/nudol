
export async function loadData() {

	const response = await fetch("http://localhost:3000/somedata")

	return { somedata: await response.text() }
}

export default function( props: any ) {

	return (
		<div>
			{ props.somedata }
		</div>
	)
}
