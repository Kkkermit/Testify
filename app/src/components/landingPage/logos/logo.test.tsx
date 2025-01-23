import { screen, render } from "@testing-library/react";
import Logo from "./logo";

describe("<Logo />", () => {
	const renderIt = async () => {
		render(<Logo />);
	};

	it("should render the logo image", async () => {
		await renderIt();
		const image = screen.getByRole("img", { name: "logo" });
		expect(image).toBeInTheDocument();
	});
});
