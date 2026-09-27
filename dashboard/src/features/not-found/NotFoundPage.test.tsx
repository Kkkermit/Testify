import { screen } from "@testing-library/react";
import { NotFoundPage } from "@/features/not-found/NotFoundPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("the not-found page", () => {
	it("says the address does not exist", () => {
		renderWithProviders(<NotFoundPage />, { path: "/nope", route: "/nope" });

		expect(screen.getByRole("heading", { level: 1, name: /page not found/i })).toBeInTheDocument();
	});

	/** Without it a bug report is "a link was broken somewhere", which is not something anybody can act on. */
	it("prints the address that missed", () => {
		renderWithProviders(<NotFoundPage />, { path: "/guilds/:guildId/typo", route: "/guilds/123/typo" });

		expect(screen.getByText("/guilds/123/typo")).toBeInTheDocument();
	});

	it("offers a way back", () => {
		renderWithProviders(<NotFoundPage />, { path: "/nope", route: "/nope" });

		expect(screen.getByRole("link", { name: /go to your servers/i })).toHaveAttribute("href", "/guilds");
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderWithProviders(<NotFoundPage />, { path: "/nope", route: "/nope" });

		await expectNoViolations(container);
	});
});

describe("where the not-found page sits", () => {
	/** An unknown address shows a 404 rather than redirecting, and does so outside the sign-in gate. */
	it("is the catch-all, and is outside the sign-in gate", async () => {
		const { routes } = await import("@/routes");
		const catchAll = routes.find((route) => "path" in route && route.path === "*");

		expect(catchAll).toBeDefined();
		// A `Navigate` carries `to`; the 404 element does not. `/` redirecting to `/guilds` is separate and correct.
		expect((catchAll as { element: { props: Record<string, unknown> } }).element.props.to).toBeUndefined();
	});
});
