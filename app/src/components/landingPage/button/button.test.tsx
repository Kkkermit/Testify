import { render, screen, fireEvent } from "@testing-library/react";
import Button from "./button";

describe("<Button />", () => {
	const renderIt = async (initialCount = 0) => {
		render(<Button initialCount={initialCount} />);
	};

	it("should render the button", async () => {
		await renderIt();
		const button = screen.getByRole("button", { name: "Click me: 0" });
		expect(button).toBeInTheDocument();
	});

	it("should execute the button function", async () => {
		await renderIt(0);
		const button = screen.getByRole("button", { name: "Click me: 0" });
		fireEvent.click(button);
		expect(button).toHaveTextContent("Click me: 1");
	});

	it("should go up in increments of 1 at a time", async () => {
		await renderIt(0);
		const button = screen.getByRole("button", { name: "Click me: 0" });
		fireEvent.click(button);
		expect(button).toHaveTextContent("Click me: 1");
		fireEvent.click(button);
		expect(button).toHaveTextContent("Click me: 2");
		fireEvent.click(button);
		expect(button).toHaveTextContent("Click me: 3");
	});

	it("should NOT go up in increments of more than 1 at a time", async () => {
		await renderIt(0);
		const button = screen.getByRole("button", { name: "Click me: 0" });
		fireEvent.click(button);
		expect(button).not.toHaveTextContent("Click me: 2");
	});
});
