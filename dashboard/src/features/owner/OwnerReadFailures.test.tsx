import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

/**
 * Every owner tab says so when its read fails, and offers a way to retry.
 *
 * Each of these hid it differently: runtime and control sat on a skeleton for ever, the usage tab reported a
 * 500 as "No usage yet" — telling an owner their bot is unused — the runner showed an empty picker, and the
 * blacklist showed a bare "Blocked accounts" heading, which on a security screen reads as nobody being blocked.
 */

const TABS: { tab: string; endpoint: string }[] = [
	{ tab: "overview", endpoint: "/api/owner/stats" },
	// The server list is a second read behind the same tab, and its own early return never reaches it.
	{ tab: "overview", endpoint: "/api/owner/guilds" },
	{ tab: "commands", endpoint: "/api/commands" },
	{ tab: "usage", endpoint: "/api/analytics/usage" },
	{ tab: "logs", endpoint: "/api/analytics/logs" },
	{ tab: "run", endpoint: "/api/owner/runner" },
	{ tab: "blacklist", endpoint: "/api/owner/blacklist" },
	{ tab: "runtime", endpoint: "/api/analytics/runtime" },
	{ tab: "control", endpoint: "/api/control" },
];

describe("an owner tab whose read fails", () => {
	it.each(TABS)("offers a retry on $tab rather than an empty screen", async ({ tab, endpoint }) => {
		server.use(
			http.get(endpoint, () => HttpResponse.json({ error: { code: "internal", message: "boom" } }, { status: 500 })),
		);

		renderWithProviders(<OwnerPage />, { path: "/owner", route: `/owner?tab=${tab}` });

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
	});

	/** The console owns the page's `<h1>`; a tab-level error that brings its own would make two. */
	it.each(TABS)("keeps one h1 on $tab", async ({ tab, endpoint }) => {
		server.use(
			http.get(endpoint, () => HttpResponse.json({ error: { code: "internal", message: "boom" } }, { status: 500 })),
		);

		renderWithProviders(<OwnerPage />, { path: "/owner", route: `/owner?tab=${tab}` });

		await screen.findByRole("button", { name: /try again/i });

		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
	});
});
