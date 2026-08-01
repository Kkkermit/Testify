import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { SignInPage } from "@/features/auth/SignInPage";
import { hardRedirect } from "@/lib/redirect";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

// jsdom's own `location` cannot be redefined, so the redirect lives behind a helper and this mocks that.
jest.mock("@/lib/redirect");

const assign = jest.mocked(hardRedirect);

describe("the sign-in page", () => {
	it("offers one button and nothing else to decide", async () => {
		renderWithProviders(<SignInPage />, { path: "/sign-in" });

		expect(await screen.findByRole("button", { name: /sign in with discord/i })).toBeInTheDocument();
	});

	/** Asking for less on the consent screen is a feature, so the page has to say what it asks for. */
	it("names the two scopes and says it does not want an email", async () => {
		renderWithProviders(<SignInPage />, { path: "/sign-in" });
		await screen.findByRole("button", { name: /sign in with discord/i });

		expect(screen.getByText("identify")).toBeInTheDocument();
		expect(screen.getByText("guilds")).toBeInTheDocument();
		expect(screen.getByText(/never asks for your email/i)).toBeInTheDocument();
	});

	/** A full page load, not a fetch: this is a redirect to Discord, not an API call. */
	it("sends the browser to the login route, carrying where they were going", async () => {
		const user = userEvent.setup();
		renderWithProviders(<SignInPage />, { path: "/sign-in", route: "/sign-in?returnTo=%2Fguilds%2F1" });

		await user.click(await screen.findByRole("button", { name: /sign in with discord/i }));

		expect(assign).toHaveBeenCalledWith("/api/auth/login?returnTo=%2Fguilds%2F1");
	});

	it("defaults to the guild picker when there is nowhere to return to", async () => {
		const user = userEvent.setup();
		renderWithProviders(<SignInPage />, { path: "/sign-in" });

		await user.click(await screen.findByRole("button", { name: /sign in with discord/i }));

		expect(assign).toHaveBeenCalledWith("/api/auth/login?returnTo=%2Fguilds");
	});

	/** Pressing Cancel on Discord's consent screen is not an error, and must not look like one. */
	it("says plainly when the Discord sign-in was cancelled", async () => {
		renderWithProviders(<SignInPage />, { path: "/sign-in", route: "/sign-in?denied=1" });

		expect(await screen.findByText(/you cancelled the discord sign-in/i)).toBeInTheDocument();
	});
});

describe("a half-configured install", () => {
	beforeEach(() => {
		server.use(
			http.get("/api/auth/setup", () =>
				HttpResponse.json({
					configured: false,
					missing: ["DISCORD_CLIENT_SECRET", "DASHBOARD_SESSION_SECRET"],
					redirectUri: "http://localhost:5174/api/auth/callback",
				}),
			),
		);
	});

	/**
	 * Journey 4. Getting this wrong is where most self-hosted dashboards lose people, so it names each missing
	 * variable rather than saying "check your configuration".
	 */
	it("lists exactly what is missing instead of offering a button that cannot work", async () => {
		renderWithProviders(<SignInPage />, { path: "/sign-in" });

		expect(await screen.findByText("DISCORD_CLIENT_SECRET")).toBeInTheDocument();
		expect(screen.getByText("DASHBOARD_SESSION_SECRET")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /sign in with discord/i })).toBeNull();
	});

	it("gives the exact redirect URI to paste into the Developer Portal", async () => {
		renderWithProviders(<SignInPage />, { path: "/sign-in" });

		expect(await screen.findByText("http://localhost:5174/api/auth/callback")).toBeInTheDocument();
	});

	it("points at the script that generates the secret", async () => {
		renderWithProviders(<SignInPage />, { path: "/sign-in" });

		expect(await screen.findByText(/npm run secret -- --write/)).toBeInTheDocument();
	});
});

describe("the bot's own identity", () => {
	/** 08-DESIGN.md: a fork should look like their bot without anybody editing CSS. */
	it("shows the bot's name and avatar rather than a hardcoded brand", async () => {
		const { container } = renderWithProviders(<SignInPage />, { path: "/sign-in" });

		expect(await screen.findByRole("heading", { name: "Testify" })).toBeInTheDocument();
		await waitFor(() => {
			expect(container.querySelector('img[src*="cdn.discordapp.com"]')).toBeInTheDocument();
		});
	});

	/** The profile is a separate request; the page must be usable whether or not it ever answers. */
	it("still offers the sign-in button when the profile cannot be fetched", async () => {
		server.use(
			http.get("/api/bot", () =>
				HttpResponse.json({ error: { code: "bot_connecting", message: "Connecting." } }, { status: 503 }),
			),
		);

		renderWithProviders(<SignInPage />, { path: "/sign-in" });

		expect(await screen.findByRole("button", { name: /sign in with discord/i })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Testify" })).toBeInTheDocument();
	});
});
