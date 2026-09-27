import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

/** Every owner tab reports a failed read with a retry rather than an empty or loading state. */

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
