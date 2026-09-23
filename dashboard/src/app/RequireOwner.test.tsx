import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { RequireOwner } from "@/app/RequireOwner";
import { me } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function signedInAs(isOwner: boolean): void {
	server.use(http.get("/api/auth/me", () => HttpResponse.json({ ...me, isOwner })));
}

/** The console shell must not render for a non-owner, or its tab names give away what the API's 404 hides. */
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
