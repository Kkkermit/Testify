import reactLogo from "../../../assets/react.svg";
import "../../../styles/index.css";

function Logo() {
	return (
		<div className="flex justify-center items-center mt-10 mb-8" data-testid="logo-container">
			<img src={reactLogo} alt="logo" className="animate-spin-slow glow-blue" />
		</div>
	);
}

export default Logo;
