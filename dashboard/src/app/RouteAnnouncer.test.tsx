import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, Link, Outlet, RouterProvider } from "react-router";
import { RouteAnnouncer } from "@/app/RouteAnnouncer";
import { pageTitle } from "@/hooks/usePageTitle";

function Shell(): React.JSX.Element {
	return (
		<>
			<RouteAnnouncer />
			<Link to="/second">Go</Link>
			<Outlet />
		</>
	);
}

function screenTitled(title: string): () => React.JSX.Element {
	return function Screen() {
		document.title = title;
		return <p>{title}</p>;
	};
}

function renderApp() {
	const router = createMemoryRouter(
		[
			{
				element: <Shell />,
				children: [
					{ path: "/", Component: screenTitled("First · Testify") },
					{ path: "/second", Component: screenTitled("Second · Testify") },
				],
			},
		],
		{ initialEntries: ["/"] },
	);

	return { ...render(<RouterProvider router={router} />), router };
}

describe("pageTitle", () => {
	/** Two tabs on the same screen in different servers are otherwise indistinguishable. */
	it("puts the server between them when there is one", () => {
		expect(pageTitle("Levelling", "Testify HQ")).toBe("Levelling · Testify HQ · Testify");
	});
});

describe("RouteAnnouncer", () => {
	it("is a polite live region, so it never interrupts", () => {
		renderApp();

		const region = screen.getByRole("status", { hidden: true });
		expect(region).toHaveAttribute("aria-live", "polite");
		expect(region).toHaveClass("sr-only");
	});

	/** The page load announces the first screen already; saying it again is noise. */
	it("says nothing on the first render", () => {
		renderApp();

		expect(screen.getByRole("status", { hidden: true })).toBeEmptyDOMElement();
	});

	/** Without this a screen reader gets no signal that the page changed at all. */
	it("announces the new page after a navigation", async () => {
		const { router } = renderApp();

		await router.navigate("/second");

		await waitFor(() => {
			expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("Second · Testify");
		});
	});
});
