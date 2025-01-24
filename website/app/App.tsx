import "./styles/index.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LandingPage from "./components/landing-page/landing-page";

function App() {
	return (
		<>
			<div id="container" data-testid="render-ui">
				<Router>
					<Routes>
						<Route path="/" element={<LandingPage />} />
					</Routes>
				</Router>
			</div>
		</>
	);
}

export default App;
