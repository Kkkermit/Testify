import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { RequireOwner } from "@/app/RequireOwner";
import { me } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function signedInAs(isOwner: boolean): void {
	server.use(http.get("/api/auth/me", () => HttpResponse.json({ ...me, isOwner })));
}

/**
 * `requireOwner` answers 404 rather than 403 so a server manager never learns the console is there. Rendering
 * the console shell to anybody who types the address undoes that — the data never arrives, but the title and
 * all eight tab names do, which names the whole feature set.
 */
describe("reaching /owner without being an owner", () => {
	it("shows the same 404 a mistyped address gets", async () => {
		signedInAs(false);
		renderWithProviders(<RequireOwner />, { path: "/owner" });

		expect(await screen.findByText(/page not found/i)).toBeInTheDocument();
	});

	it("names neither the console nor any of its tabs", async () => {
		signedInAs(false);
		const { container } = renderWithProviders(<RequireOwner />, { path: "/owner" });
		await screen.findByText(/page not found/i);

		const rendered = container.textContent;
		for (const leak of ["Owner console", "Blacklist", "Runtime", "Shut down", "Logs"]) {
			expect(rendered).not.toContain(leak);
		}
	});

	/** Two `<main>` landmarks is invalid, and gives a screen reader two "main" regions to choose between. */
	it("brings no landmark of its own, because the shell already has one", async () => {
		signedInAs(false);
		const { container } = renderWithProviders(<RequireOwner />, { path: "/owner" });
		await screen.findByText(/page not found/i);

		expect(container.querySelectorAll("main")).toHaveLength(0);
	});

	it("lets an owner through to the route below it", async () => {
		signedInAs(true);
		renderWithProviders(<RequireOwner />, { path: "/owner" });

		expect(await screen.findByText(/page not found/i).catch(() => null)).toBeNull();
	});
});
