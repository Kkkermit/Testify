import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AppShell } from "@/app/AppShell";
import { RequireAuth } from "@/app/RequireAuth";
import { hardRedirect } from "@/lib/redirect";
import { aGuild, me } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

jest.mock("@/lib/redirect");

describe("the app shell", () => {
	it("always offers a way back to the server list", async () => {
		renderWithProviders(<AppShell />, { path: "/guilds" });

		expect(await screen.findByRole("link", { name: "Servers" })).toHaveAttribute("href", "/guilds");
	});

	/** A keyboard user should not tab through the whole sidebar to reach the page. */
	it("starts with a skip link", () => {
		renderWithProviders(<AppShell />, { path: "/guilds" });

		expect(screen.getByRole("link", { name: /skip to content/i })).toHaveAttribute("href", "#content");
	});

	it("names the guild being configured once there is one", async () => {
		renderWithProviders(<AppShell />, { path: "/guilds/:guildId", route: `/guilds/${aGuild.id}` });

		expect(await screen.findByRole("link", { name: "Test Server" })).toBeInTheDocument();
	});

	it("shows no guild link on the picker itself", async () => {
		renderWithProviders(<AppShell />, { path: "/guilds" });
		await screen.findByRole("link", { name: "Servers" });

		expect(screen.queryByRole("link", { name: "Test Server" })).toBeNull();
	});

	/** Hiding it is not access control — the API refuses too — but a manager has no use for the link. */
	it("hides the owner console from someone who is not the bot owner", async () => {
		renderWithProviders(<AppShell />, { path: "/guilds" });
		await screen.findByRole("link", { name: "Servers" });

		expect(screen.queryByRole("link", { name: "Owner" })).toBeNull();
	});

	it("shows the owner console to the bot owner", async () => {
		server.use(http.get("/api/auth/me", () => HttpResponse.json({ ...me, isOwner: true })));

		renderWithProviders(<AppShell />, { path: "/guilds" });

		expect(await screen.findByRole("link", { name: "Owner" })).toHaveAttribute("href", "/owner");
	});

	/**
	 * Clearing the cache matters as much as the redirect: without it the next person at this browser would see
	 * the previous one's guild list until the queries went stale.
	 */
	it("drops every cached answer when signing out", async () => {
		const user = userEvent.setup();
		server.use(http.post("/api/auth/logout", () => new HttpResponse(null, { status: 204 })));

		const { client } = renderWithProviders(<AppShell />, { path: "/guilds" });
		await screen.findByText("someone");

		await user.click(screen.getByRole("button", { name: /sign out/i }));

		await waitFor(() => {
			expect(jest.mocked(hardRedirect)).toHaveBeenCalledWith("/sign-in");
		});
		expect(client.getQueryCache().getAll()).toHaveLength(0);
	});
});

describe("RequireAuth", () => {
	it("lets a signed-in visitor through", async () => {
		renderWithProviders(<RequireAuth />, { path: "/guilds" });

		await waitFor(() => {
			expect(document.body.textContent).not.toContain("Sign in");
		});
	});

	/** 401 is a normal answer here — it means "show the sign-in screen", not "something broke". */
	it("does not treat a signed-out visitor as an error", async () => {
		server.use(
			http.get("/api/auth/me", () =>
				HttpResponse.json({ error: { code: "unauthenticated", message: "no" } }, { status: 401 }),
			),
		);

		renderWithProviders(<RequireAuth />, { path: "/guilds" });

		await waitFor(() => {
			expect(document.body.textContent).not.toMatch(/something went wrong/i);
		});
	});
});
