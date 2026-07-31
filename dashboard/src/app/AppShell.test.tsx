import { screen, waitFor, within } from "@testing-library/react";
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

	/**
	 * At the icon-only width the labels are `sr-only`, not `hidden` — `hidden` is `display: none`, which takes
	 * them out of the accessibility tree and leaves every nav link named nothing.
	 *
	 * jsdom loads no stylesheet, so it cannot tell the two apart by computing a name; the class is the only
	 * observable difference here. The rendered outcome is checked against a real browser instead.
	 */
	it("hides the nav labels visually rather than removing them", async () => {
		server.use(http.get("/api/auth/me", () => HttpResponse.json({ ...me, isOwner: true })));
		renderWithProviders(<AppShell />, { path: "/guilds" });

		// The owner link is the last to appear, so waiting on it means the whole nav is rendered.
		const owner = await screen.findByRole("link", { name: "Owner" });
		const label = owner.querySelector("span:not([aria-hidden])");

		expect(label).toHaveClass("sr-only");
		expect(label).not.toHaveClass("hidden");
	});
});

describe("the mobile menu", () => {
	it("is closed to begin with", async () => {
		renderWithProviders(<AppShell />, { path: "/guilds" });
		await screen.findByRole("link", { name: "Servers" });

		expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
	});

	it("opens the drawer, and closes on Escape", async () => {
		const user = userEvent.setup();
		renderWithProviders(<AppShell />, { path: "/guilds" });
		await screen.findByRole("link", { name: "Servers" });

		const menu = screen.getByRole("button", { name: "Menu" });
		await user.click(menu);

		expect(menu).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByTestId("sidebar-drawer")).toBeInTheDocument();

		await user.keyboard("{Escape}");

		await waitFor(() => {
			expect(screen.queryByTestId("sidebar-drawer")).toBeNull();
		});
	});

	/** A drawer left open covers the page it was used to reach. */
	it("closes when a link inside it is used", async () => {
		const user = userEvent.setup();
		renderWithProviders(<AppShell />, { path: "/guilds" });
		await screen.findByRole("link", { name: "Servers" });

		await user.click(screen.getByRole("button", { name: "Menu" }));
		const drawer = screen.getByTestId("sidebar-drawer");

		await user.click(within(drawer).getByRole("link", { name: "Servers" }));

		await waitFor(() => {
			expect(screen.queryByTestId("sidebar-drawer")).toBeNull();
		});
	});

	it("puts focus back on the menu button when it is dismissed", async () => {
		const user = userEvent.setup();
		renderWithProviders(<AppShell />, { path: "/guilds" });
		await screen.findByRole("link", { name: "Servers" });

		const menu = screen.getByRole("button", { name: "Menu" });
		await user.click(menu);
		await user.click(screen.getByRole("button", { name: "Close the menu" }));

		await waitFor(() => {
			expect(menu).toHaveFocus();
		});
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
