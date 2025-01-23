import "../../styles/index.css";
import Button from "./button/button";
import Logo from "./logos/logo";

function Landing() {
	return (
		<>
			<div className="flex flex-col justify-center items-center h-screen">
				<Logo />
				<h1 className="text-blue-600 text-4xl mb-8">This epic ass thing was made by Kkermit</h1>
				<Button />
			</div>
		</>
	);
}

export default Landing;
