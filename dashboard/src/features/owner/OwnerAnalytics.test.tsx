import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { barWidth, levelFrom, percent, shortDay, windowFrom } from "@/features/owner/owner.utils";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { expectNoViolations } from "@/test/axe";
import { logFeed, usageReport } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderTab(tab: string) {
	return renderWithProviders(<OwnerPage />, { path: "/owner", route: `/owner?tab=${tab}` });
}

describe("windowFrom", () => {
	/** The API aggregates three windows and 400s on anything else, so a URL cannot ask for a fourth. */
	it("falls back to 30 days for anything the API does not serve", () => {
		for (const raw of [null, "", "1", "365", "abc", "-7"]) expect(windowFrom(raw)).toBe(30);
	});

	it("reads a window it does serve", () => {
		expect(windowFrom("7")).toBe(7);
		expect(windowFrom("90")).toBe(90);
	});
});

describe("levelFrom", () => {
	it("falls back to info, and never to a level the API refuses", () => {
		expect(levelFrom("trace")).toBe("info");
		expect(levelFrom(null)).toBe("info");
		expect(levelFrom("error")).toBe("error");
	});
});

describe("barWidth", () => {
	it("scales against the busiest row", () => {
		expect(barWidth(50, 100)).toBe(50);
		expect(barWidth(100, 100)).toBe(100);
	});

	/** A row with one use is still a row; a 0%-wide bar looks like a rendering failure. */
	it("keeps a tiny value visible", () => {
		expect(barWidth(1, 10_000)).toBe(2);
	});

	it("is nothing at all for a zero", () => {
		expect(barWidth(0, 100)).toBe(0);
		expect(barWidth(5, 0)).toBe(0);
	});
});

describe("percent", () => {
	it("reads to one decimal, and survives a zero denominator", () => {
		expect(percent(12, 1_240)).toBe("1%");
		expect(percent(1, 3)).toBe("33.3%");
		expect(percent(0, 0)).toBe("0%");
	});
});

describe("shortDay", () => {
	it("shortens a day key, in UTC so it cannot slip a day", () => {
		// The format follows the reader's locale, so the assertion is on the parts rather than their order.
		expect(shortDay("2026-08-01")).toMatch(/Aug/);
		expect(shortDay("2026-08-01")).toMatch(/\b1\b/);
	});

	it("gives back what it was handed when that is not a date", () => {
		expect(shortDay("nonsense")).toBe("nonsense");
	});
});

describe("the usage tab", () => {
	it("reports the totals for the window", async () => {
		renderTab("usage");

		expect(await screen.findByText("1,240")).toBeInTheDocument();
		expect(screen.getByText("2 of 76")).toBeInTheDocument();
	});

	it("ranks the most used commands", async () => {
		renderTab("usage");
		const panel = (await screen.findByRole("heading", { name: "Most used" })).closest("div")?.parentElement;

		expect(within(panel!).getByText("/rank")).toBeInTheDocument();
		expect(within(panel!).getByText("800")).toBeInTheDocument();
	});

	/** The point of the least-used list: a command nobody has run is a zero, not an absence. */
	it("shows a command that has never been run", async () => {
		renderTab("usage");

		expect(await screen.findByText("/flush")).toBeInTheDocument();
	});

	it("names the busiest servers", async () => {
		renderTab("usage");

		expect(await screen.findByText("Test Server")).toBeInTheDocument();
		expect(screen.getByText("900")).toBeInTheDocument();
	});

	it("splits slash from prefix, which is what decides if the prefix earns its keep", async () => {
		renderTab("usage");

		expect(await screen.findByText("Slash commands")).toBeInTheDocument();
		expect(screen.getByText("Prefix commands")).toBeInTheDocument();
	});

	it("asks the API for the window that was chosen", async () => {
		const user = userEvent.setup();
		const asked: string[] = [];
		server.use(
			http.get("/api/analytics/usage", ({ request }) => {
				asked.push(new URL(request.url).searchParams.get("days") ?? "");
				return HttpResponse.json(usageReport);
			}),
		);

		renderTab("usage");
		await screen.findByText("1,240");
		await user.click(screen.getByRole("button", { name: "7d" }));

		expect(asked).toContain("7");
	});

	/** The bars are decoration; the numbers behind them have to be readable without them. */
	it("puts the daily figures in a table for a screen reader", async () => {
		renderTab("usage");

		expect(await screen.findByRole("table", { name: /commands run per day/i })).toBeInTheDocument();
	});
});

describe("the logs tab", () => {
	it("shows the buffered lines", async () => {
		renderTab("logs");

		expect(await screen.findByText("[BAN] Failed to ban member")).toBeInTheDocument();
		expect(screen.getByText("[READY] Logged in")).toBeInTheDocument();
	});

	it("says how much of the buffer is in use", async () => {
		renderTab("logs");

		expect(await screen.findByText(/last 2 of 250 lines/i)).toBeInTheDocument();
	});

	it("asks the API for the level that was chosen", async () => {
		const user = userEvent.setup();
		const asked: string[] = [];
		server.use(
			http.get("/api/analytics/logs", ({ request }) => {
				asked.push(new URL(request.url).searchParams.get("level") ?? "");
				return HttpResponse.json(logFeed);
			}),
		);

		renderTab("logs");
		await screen.findByText("[READY] Logged in");
		await user.click(screen.getByRole("button", { name: "Errors" }));

		expect(asked).toContain("error");
	});

	it("says plainly that secrets were stripped before storage", async () => {
		renderTab("logs");

		expect(await screen.findByText(/token, a password or a connection string was removed/i)).toBeInTheDocument();
	});
});

describe("the runtime tab", () => {
	it("says what the bot is running as", async () => {
		renderTab("runtime");

		// The version appears in the table and again in the update note, so both are expected.
		expect(await screen.findAllByText("v2.0.0")).toHaveLength(2);
		expect(screen.getByText("v22.22.2")).toBeInTheDocument();
		expect(screen.getByText("v14.27.0")).toBeInTheDocument();
	});

	/** A self-hosted bot that phones home on a timer is not something to ship by default. */
	it("links the releases page rather than claiming to have checked", async () => {
		renderTab("runtime");

		const link = await screen.findByRole("link", { name: /releases on github/i });

		expect(link).toHaveAttribute("href", "https://github.com/Kkkermit/Testify/releases");
		expect(screen.getByText(/never contacts a server to check/i)).toBeInTheDocument();
	});
});

describe("moving between the tabs", () => {
	it("puts the tab in the URL, so a link to one is a link to one", async () => {
		const user = userEvent.setup();
		const { search } = renderTab("overview");
		await screen.findByRole("tab", { name: "Usage" });

		await user.click(screen.getByRole("tab", { name: "Usage" }));

		expect(await screen.findByText("1,240")).toBeInTheDocument();
		expect(search()).toContain("tab=usage");
	});

	/** Changing the window must not throw away the tab, which a whole-query replace would. */
	it("keeps the tab when another parameter changes", async () => {
		const user = userEvent.setup();
		const { search } = renderTab("usage");
		await screen.findByText("1,240");

		await user.click(screen.getByRole("button", { name: "90d" }));

		expect(search()).toContain("tab=usage");
		expect(search()).toContain("days=90");
	});
});

describe("the analytics tabs accessibility", () => {
	it.each(["usage", "logs", "runtime"])("has no automatically detectable violations on %s", async (tab) => {
		const { container } = renderTab(tab);
		await screen.findByRole("tab", { name: "Runtime" });

		await expectNoViolations(container);
	});
});
