import "./styles/index.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Landing from "./components/landingPage/landing-page";

function App() {
	return (
		<>
			<div className="bg-gray-800 min-h-screen" id="container" data-testid="render-ui">
				<Router>
					<Routes>
						<Route path="/" element={<Landing />} />
					</Routes>
				</Router>
			</div>
		</>
	);
}

export default App;
