


export default function( props: any ) {


	return (
		<html>
			<head>
				{ props.hydrationScript() }
			</head>

			<body>
				<div id="root">{ props.children }</div>
			</body>
		</html>
	)

} 
