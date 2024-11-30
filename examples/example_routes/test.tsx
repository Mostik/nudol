
export async function loadData() {

	const response = await fetch("http://localhost:3000/getUser")

	return await response.json() 
}

export default function( props: any ) {

	console.log( props )

	return(
		<div> Test page, { props.name } </div>
	)
}
