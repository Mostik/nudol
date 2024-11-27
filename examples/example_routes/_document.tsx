


export default function( props: any ) {


	return (
		<html>
			<head>
				{ props.hydrationScript( props.hydrationpath ) }
			</head>

			<body>
				<div id="root">{ props.children }</div>
			</body>
		</html>
	)

} 
