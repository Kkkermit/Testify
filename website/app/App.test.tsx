import { render, screen } from "@testing-library/react";
import App from "./App";

describe("<App />", () => {
	const renderIt = async () => {
		render(<App />);
	};

	it("renders the UI", async () => {
		await renderIt();
		expect(screen.getByTestId("render-ui")).toBeInTheDocument();
	});

	it("should deep render the screen to display the text", async () => {
		await renderIt();
		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent("This epic ass thing was made by Kkermit");
		expect(heading).toBeInTheDocument();
	});
});
