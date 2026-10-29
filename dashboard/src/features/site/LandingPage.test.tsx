import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { LandingPage } from "@/features/site/LandingPage";
import { hardRedirect } from "@/lib/redirect";
import { expectNoViolations } from "@/test/axe";
import { siteInfo } from "@/test/fixtures/site";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

jest.mock("@/lib/redirect");

function signedOut(): void {
	server.use(
		http.get("/api/auth/me", () =>
			HttpResponse.json({ error: { code: "unauthenticated", message: "x" } }, { status: 401 }),
		),
	);
}

describe("the landing page", () => {
	/** Signing in is the page's one job, so it is the primary action until it is done. */
	it("leads with signing in, and sends the browser straight to Discord", async () => {
		signedOut();
		const user = userEvent.setup();
		renderWithProviders(<LandingPage />);

		await user.click(await screen.findByRole("button", { name: /sign in with discord/i }));

		expect(jest.mocked(hardRedirect)).toHaveBeenCalledWith("/api/auth/login?returnTo=%2Fguilds");
	});

	it("offers the servers once somebody is signed in", async () => {
		renderWithProviders(<LandingPage />);

		expect(await screen.findByRole("link", { name: /open your servers/i })).toHaveAttribute("href", "/guilds");
		expect(screen.queryByRole("button", { name: /sign in/i })).toBeNull();
	});

	/** A host with no dashboard would refuse the sign-in, so the button is not offered at all. */
	it("offers no sign-in where this host has no dashboard", async () => {
		server.use(http.get("/api/site", () => HttpResponse.json({ ...siteInfo, dashboard: false })));
		renderWithProviders(<LandingPage />);

		expect(await screen.findByRole("link", { name: /add to discord/i })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /sign in/i })).toBeNull();
		expect(screen.queryByRole("link", { name: /open your servers/i })).toBeNull();
	});

	it("says in words what the moving message box types, and how to type it with the prefix", async () => {
		renderWithProviders(<LandingPage />);

		expect(
			await screen.findByText(/an example of a command typed in discord: \/play query: lofi beats/i),
		).toBeInTheDocument();
		expect(screen.getByText("t?play lofi beats")).toBeInTheDocument();
	});

	/** Running a copy is the one real sequence on the page, so its steps are numbered and each opens its docs page. */
	it("walks a self-hoster through four docs pages in order", async () => {
		renderWithProviders(<LandingPage />);

		const steps = within(
			(await screen.findByRole("heading", { name: /run your own copy/i })).parentElement!,
		).getAllByRole("link");
		expect(steps.map((step) => step.getAttribute("href"))).toEqual([
			"/docs/requirements",
			"/docs/setup",
			"/docs/quick-start",
			"/docs/docker",
		]);
	});

	it("passes axe", async () => {
		const { container } = renderWithProviders(<LandingPage />);

		await screen.findByRole("link", { name: /open your servers/i });
		await expectNoViolations(container);
	});
});
