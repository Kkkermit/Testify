import { type OwnerGuildRow, type OwnerStats, type Paged } from "@testify/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { OWNER_TABS } from "@/features/owner/owner.types";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { formatUptime } from "@/lib/datetime";
import { expectNoViolations } from "@/test/axe";
import { guildDetail } from "@/test/fixtures/owner";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const stats: OwnerStats = {
	guilds: 3,
	users: 4_200,
	uptimeMs: 90_000_000,
	memoryMb: 128,
	commands: 76,
	database: "connected",
};

function row(overrides: Partial<OwnerGuildRow> = {}): OwnerGuildRow {
	return {
		id: "900000000000000001",
		name: "Test Server",
		iconUrl: null,
		memberCount: 1_234,
		joinedAt: null,
		configured: ["levelling"],
		commands: 0,
		dashboardViews: 0,
		...overrides,
	};
}

function page(items: OwnerGuildRow[], total = items.length): Paged<OwnerGuildRow> {
	return { items, total, page: 1, perPage: 25 };
}

function useOwnerApi(items: OwnerGuildRow[], total?: number): void {
	server.use(
		http.get("/api/owner/stats", () => HttpResponse.json(stats)),
		http.get("/api/owner/guilds", () => HttpResponse.json(page(items, total))),
	);
}

describe("formatUptime", () => {
	it("reads at the scale it is at", () => {
		expect(formatUptime(90_000_000)).toBe("1d 1h");
		expect(formatUptime(3_900_000)).toBe("1h 5m");
		expect(formatUptime(120_000)).toBe("2m");
	});
});

describe("the owner console", () => {
	/** The question this screen exists to answer: which of my servers has never configured anything. */
	it("calls out a server with nothing set up", async () => {
		useOwnerApi([row({ configured: [] })]);
		renderWithProviders(<OwnerPage />, { path: "/owner" });

		expect(await screen.findByText("Nothing set up")).toBeInTheDocument();
	});

	it("renders the servers as a real table, so it can be read by a screen reader", async () => {
		useOwnerApi([row()]);
		renderWithProviders(<OwnerPage />, { path: "/owner" });

		expect(await screen.findByRole("table")).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: "Server" })).toBeInTheDocument();
	});

	it("hides the pager when everything fits on one page", async () => {
		useOwnerApi([row()]);
		renderWithProviders(<OwnerPage />, { path: "/owner" });
		await screen.findByRole("table");

		expect(screen.queryByRole("navigation", { name: /pages/i })).toBeNull();
	});

	/** A manager who guesses the URL gets a 404, and the screen must not confirm the console exists. */
	it("does not confirm the console exists when the API refuses", async () => {
		server.use(
			http.get("/api/owner/stats", () =>
				HttpResponse.json({ error: { code: "not_found", message: "No such endpoint." } }, { status: 404 }),
			),
			http.get("/api/owner/guilds", () =>
				HttpResponse.json({ error: { code: "not_found", message: "No such endpoint." } }, { status: 404 }),
			),
		);

		renderWithProviders(<OwnerPage />, { path: "/owner" });

		expect((await screen.findAllByText(/something went wrong/i)).length).toBeGreaterThan(0);
		expect(screen.queryByRole("table")).toBeNull();
	});

	/** The features came through as the overview's keys, so an owner read "audit-logging" where a manager reads its name. */
	it("names each feature a server has set up, and shows one it does not know as sent", async () => {
		useOwnerApi([row({ configured: ["audit-logging", "something-new"] })]);
		server.use(
			http.get("/api/control/guilds/:guildId", () => HttpResponse.json({ ...guildDetail, configured: ["starboard"] })),
		);
		renderWithProviders(<OwnerPage />, { path: "/owner", route: "/owner?server=900000000000000001" });

		const table = await screen.findByRole("table");
		expect(within(table).getByText("Audit logging")).toBeInTheDocument();
		expect(within(table).getByText("something-new")).toBeInTheDocument();
		expect(within(table).queryByText("audit-logging")).toBeNull();
		expect(await screen.findByText("Starboard")).toBeInTheDocument();
	});

	/** A failed read of the figures once took the server list down with it, though the list reads on its own. */
	it("keeps the server list when the figures cannot be read", async () => {
		useOwnerApi([row()]);
		server.use(
			http.get("/api/owner/stats", () =>
				HttpResponse.json({ error: { code: "internal", message: "boom" } }, { status: 500 }),
			),
		);
		renderWithProviders(<OwnerPage />, { path: "/owner" });

		expect(await screen.findByRole("table")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
	});

	/** A server the detail card could not read once showed a skeleton for ever, with no way to retry or close it. */
	it("says a server's details could not be read, and still closes", async () => {
		useOwnerApi([row()]);
		server.use(
			http.get("/api/control/guilds/:guildId", () =>
				HttpResponse.json({ error: { code: "internal", message: "boom" } }, { status: 500 }),
			),
		);
		const view = renderWithProviders(<OwnerPage />, { path: "/owner", route: "/owner?server=900000000000000001" });

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Close" }));
		await waitFor(() => {
			expect(view.search()).not.toContain("server=");
		});
	});

	/** The id is put into the request's path, so anything but an id is never asked for. */
	it("asks for no server's details when the address holds something other than an id", async () => {
		useOwnerApi([row()]);
		const asked: string[] = [];
		server.use(
			http.get("/api/control/guilds/:guildId", ({ request }) => {
				asked.push(request.url);
				return HttpResponse.json({});
			}),
		);
		renderWithProviders(<OwnerPage />, { path: "/owner", route: "/owner?server=not-an-id" });
		await screen.findByRole("table");

		expect(asked).toEqual([]);
	});
});

/**
 * `TabContent` is a bare `<div>`, so every tab brings its own vertical rhythm; jsdom has no styles, so this pins the
 * class.
 */
describe("every owner console tab brings its own vertical rhythm", () => {
	it.each(OWNER_TABS.map((tab) => tab.key))("%s", async (key) => {
		useOwnerApi([row()]);
		renderWithProviders(<OwnerPage />, { path: "/owner", route: `/owner?tab=${key}` });

		const panel = await screen.findByRole("tabpanel");
		await waitFor(() => {
			const root = panel.firstElementChild;
			expect(root?.className).toMatch(/\bflex-col\b/);
			expect(root?.className).toMatch(/\bgap-\d\b/);
		});
	});
});

describe("OwnerPage accessibility", () => {
	it("has no automatically detectable violations", async () => {
		useOwnerApi([row()]);
		const { container } = renderWithProviders(<OwnerPage />, { path: "/owner" });
		await screen.findByRole("table");

		await expectNoViolations(container);
	});
});
