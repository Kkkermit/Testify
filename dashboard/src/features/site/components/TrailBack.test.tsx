import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Link, RouterProvider } from "react-router";
import { TrailBack } from "@/features/site/components/TrailBack";
import { trailLabel } from "@/features/site/trail.utils";
import { followTrails } from "@/lib/trail";
import { t } from "@/test/english";

function renderAt(start: string) {
	const router = createMemoryRouter(
		[
			{
				path: "/docs/:slug",
				element: (
					<>
						<TrailBack />
						<Link to="/source-code/src/core/loader.ts">loader.ts</Link>
						<Link to="/terms">Terms</Link>
					</>
				),
			},
			{ path: "/source-code/*", element: <TrailBack /> },
			{ path: "/terms", element: <TrailBack fallback={<span>Back to the dashboard</span>} /> },
		],
		{ initialEntries: [start] },
	);
	followTrails(router);
	render(<RouterProvider router={router} />);
	return router;
}

beforeEach(() => {
	sessionStorage.clear();
});

describe("the way back", () => {
	/** Going back through history, not forward to the address, is what returns the reader to their place on the page. */
	it("names the page a link was followed from, and goes back to it", async () => {
		const user = userEvent.setup();
		const router = renderAt("/docs/quick-start");
		expect(screen.queryByRole("link", { name: /back to/i })).toBeNull();

		await user.click(screen.getByRole("link", { name: "loader.ts" }));
		const back = await screen.findByRole("link", { name: "Back to Quick start" });
		expect(back).toHaveAttribute("href", "/docs/quick-start");

		await user.click(back);
		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/docs/quick-start");
		});
		expect(router.state.historyAction).toBe("POP");
	});

	/** The legal pages keep their own way out for a reader who did not arrive by a docs link. */
	it("stands aside for the page's own link when there is no trail", async () => {
		const user = userEvent.setup();
		renderAt("/terms");
		expect(screen.getByText("Back to the dashboard")).toBeInTheDocument();

		const router = renderAt("/docs/configuration");
		await user.click(screen.getAllByRole("link", { name: "Terms" })[0]!);
		expect(await screen.findByRole("link", { name: "Back to Configuration" })).toBeInTheDocument();
		expect(router.state.location.pathname).toBe("/terms");
	});
});

describe("trailLabel", () => {
	it("names each page as the reader saw it named", () => {
		const cases = [
			["/docs", "Docs"],
			["/docs/quick-start", "Quick start"],
			["/docs/no-such-page", "Docs"],
			["/source-code", "Source code"],
			["/source-code/src/core", "core"],
			["/source-code/docs/My%20notes.md", "My notes.md"],
			["/source-code/bad%E0%A4%A", "bad%E0%A4%A"],
		] as const;

		expect(cases.map(([pathname]) => trailLabel(pathname, t))).toEqual(cases.map(([, label]) => label));
	});
});
