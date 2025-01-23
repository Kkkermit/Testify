import { render, screen } from "@testing-library/react";
import Landing from "./landing-page";

describe("<Landing />", () => {
	const renderIt = async () => {
		render(<Landing />);
	};

	it("should render the heading role with text", async () => {
		await renderIt();
		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent("This epic ass thing was made by Kkermit");
		expect(heading).toBeInTheDocument();
	});

	it("should NOT render the heading role with text that is incorrect", async () => {
		await renderIt();
		const heading = screen.queryByRole("heading", { level: 1 });
		expect(heading).not.toHaveTextContent("This epic ass thing was NOT made by Kkermit");
	});
});
