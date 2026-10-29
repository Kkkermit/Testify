import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { barWidth } from "@/components/primitives/UsageBars";
import { levelFrom, shortDay, windowFrom } from "@/features/owner/owner.utils";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";

function renderTab(tab: string) {
	return renderWithProviders(<OwnerPage />, { path: "/owner", route: `/owner?tab=${tab}` });
}

describe("windowFrom", () => {
	/** The API aggregates three windows and 400s on anything else, so a URL cannot ask for a fourth. */
	it("falls back to 30 days for anything the API does not serve", () => {
		for (const raw of [null, "", "1", "365", "abc", "-7"]) expect(windowFrom(raw)).toBe(30);
	});
});

describe("levelFrom", () => {
	it("shows every level by default, and never one the API refuses", () => {
		expect(levelFrom(null)).toBe("trace");
		expect(levelFrom("nonsense")).toBe("trace");
		expect(levelFrom("debug")).toBe("debug");
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

describe("shortDay", () => {
	it("shortens a day key, in UTC so it cannot slip a day", () => {
		// The format follows the reader's locale, so the assertion is on the parts rather than their order.
		expect(shortDay("2026-08-01")).toMatch(/Aug/);
		expect(shortDay("2026-08-01")).toMatch(/\b1\b/);
	});
});

describe("the usage tab", () => {
	/** The point of the least-used list: a command nobody has run is a zero, not an absence. */
	it("shows a command that has never been run", async () => {
		renderTab("usage");

		expect(await screen.findByText("/flush")).toBeInTheDocument();
	});

	/** Ranked by the slow tail, with the typical time beside it, so one hung run reads differently from a slow command. */
	it("names the slowest commands with their slow and typical times", async () => {
		renderTab("usage");

		expect(await screen.findByRole("heading", { name: "Slowest commands" })).toBeInTheDocument();
		expect(screen.getByText("4.2s")).toBeInTheDocument();
		expect(screen.getByText("40 runs · typically 850 ms")).toBeInTheDocument();
		expect(screen.getByText("1,300 runs · typically 90 ms")).toBeInTheDocument();
		expect(screen.getByText(/over the last 30 days in servers/)).toBeInTheDocument();
	});

	/** The bars are decoration; the numbers behind them have to be readable without them. */
	it("puts the daily figures in a table for a screen reader", async () => {
		renderTab("usage");

		expect(await screen.findByRole("table", { name: /commands run per day/i })).toBeInTheDocument();
	});
});

describe("the logs tab", () => {
	/** Every level is offered now, so a debug line can actually be found. */
	it("offers every level the bot can write", async () => {
		renderTab("logs");
		await screen.findByText("[READY] Logged in");

		for (const label of ["All", "Debug", "Info", "Warnings", "Errors", "Fatal"]) {
			expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
		}
	});

	/** An empty list at "All" otherwise reads as an idle bot rather than a level that never writes those lines. */
	it("says when the bot's own level is suppressing everything below it", async () => {
		renderTab("logs");

		expect(await screen.findByText(/LOG_LEVEL=info/)).toBeInTheDocument();
	});

	it("says plainly that secrets were stripped before storage", async () => {
		renderTab("logs");

		expect(await screen.findByText(/token, a password or a connection string was removed/i)).toBeInTheDocument();
	});
});

describe("the runtime tab", () => {
	/** A self-hosted bot that phones home on a timer is not something to ship by default. */
	it("links the releases page rather than claiming to have checked", async () => {
		renderTab("runtime");

		const link = await screen.findByRole("link", { name: /releases on github/i });

		expect(link).toHaveAttribute("href", "https://github.com/Kkkermit/Testify/releases");
		expect(screen.getByText(/never contacts a server to check/i)).toBeInTheDocument();
	});
});

describe("moving between the tabs", () => {
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
