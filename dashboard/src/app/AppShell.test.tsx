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

		// The group is named by the list's label rather than a heading, so the page's heading outline stays clean.
		expect(await screen.findByRole("list", { name: "Test Server" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", `/guilds/${aGuild.id}`);
	});

	it("shows no server section on the picker itself", async () => {
		renderWithProviders(<AppShell />, { path: "/guilds" });
		await screen.findByRole("link", { name: "Servers" });

		expect(screen.queryByRole("list", { name: "Test Server" })).toBeNull();
		expect(screen.queryByRole("link", { name: "Overview" })).toBeNull();
	});

	/** Hiding it is not access control — the API refuses too — but a manager has no use for the link. */
	it("hides the owner console from someone who is not the bot owner", async () => {
		renderWithProviders(<AppShell />, { path: "/guilds" });
		await screen.findByRole("link", { name: "Servers" });

		expect(screen.queryByRole("link", { name: "Owner console" })).toBeNull();
	});

	it("shows the owner console to the bot owner", async () => {
		server.use(http.get("/api/auth/me", () => HttpResponse.json({ ...me, isOwner: true })));

		renderWithProviders(<AppShell />, { path: "/guilds" });

		expect(await screen.findByRole("link", { name: "Owner console" })).toHaveAttribute("href", "/owner");
	});

	/** Without clearing the cache the next person at this browser sees the previous one's guild list. */
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

	/** `hidden` is `display: none`, which would leave every nav link named nothing; jsdom computes no styles, so the class is what is asserted. */
	it("hides the nav labels visually rather than removing them", async () => {
		server.use(http.get("/api/auth/me", () => HttpResponse.json({ ...me, isOwner: true })));
		renderWithProviders(<AppShell />, { path: "/guilds" });

		// The owner link is the last to appear, so waiting on it means the whole nav is rendered.
		const owner = await screen.findByRole("link", { name: "Owner console" });
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
