import { useState } from "react";
import "../../../styles/index.css";

interface ButtonProps {
	initialCount?: number;
}

const Button: React.FC<ButtonProps> = ({ initialCount = 0 }) => {
	const [count, setCount] = useState(initialCount);

	const handleClick = () => {
		setCount(count + 1);
	};

	return (
		<div className="bg-gray-800 flex justify-center items-center">
			<button onClick={handleClick} className="bg-blue-500 text-white p-4 rounded">
				Click me: {count}
			</button>
		</div>
	);
};

export default Button;
