import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { barWidth } from "@/components/primitives/UsageBars";
import { levelFrom, shortDay, windowFrom } from "@/features/owner/owner.utils";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { expectNoViolations } from "@/test/axe";
import { logFeed, logRuns, PAST_RUN, shardlensStatus } from "@/test/fixtures/owner";
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
		expect(screen.getByText(/how long Discord waited for the bot’s first reply/i)).toBeInTheDocument();
	});

	/** The bars are decoration; the numbers behind them have to be readable without them. */
	it("puts the daily figures in a table for a screen reader", async () => {
		renderTab("usage");

		expect(await screen.findByRole("table", { name: /commands run per day/i })).toBeInTheDocument();
	});
});

describe("the logs tab", () => {
	/** Every level is offered, so a debug line can be found. */
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

	/** Six starts are kept, and a run with no shutdown recorded is the one that crashed, so it reads as one. */
	it("lists the runs kept, the one going now first, and marks one that never shut down", async () => {
		renderTab("logs");

		const runs = await screen.findByRole("group", { name: "Runs" });
		const radios = within(runs).getAllByRole("radio");

		expect(radios).toHaveLength(2);
		expect(within(runs).getByRole("radio", { name: /Running now/ })).toBeChecked();
		expect(within(runs).getByText(/No shutdown recorded, last line/)).toHaveClass("text-destructive-text");
		expect(within(runs).getByText("3 warnings")).toBeInTheDocument();
		expect(screen.getByText(/last 6 starts are kept/)).toBeInTheDocument();
	});

	/** A past run is read from the database: it cannot change, so nothing pauses it, and its error opens to its whole stack. */
	it("opens a past run, its error's whole stack and what caused it", async () => {
		const user = userEvent.setup();
		const { search } = renderTab("logs");

		await user.click(await screen.findByRole("radio", { name: /30 Jul 2026/ }));
		const line = await screen.findByText("[COMMAND_ERROR] A command failed.");
		await user.click(line);

		expect(search()).toContain(`run=${PAST_RUN}`);
		expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
		expect(screen.getByText(/at handleErrors \(rest\.js:762:13\)/)).toBeVisible();
		expect(screen.getByText("Caused by")).toBeVisible();
		expect(screen.getByText(/at clear\.js:61:5/)).toBeVisible();
		expect(screen.getByText(/"code": 50035/)).toBeVisible();
		expect(screen.getByText(/"command": "clear"/)).toBeVisible();
	});

	/** A reference from an old failure is in one of six runs, and the list says which before anybody opens one. */
	it("says how many lines a search finds in each run", async () => {
		server.use(
			http.get("/api/analytics/logs/runs", ({ request }) => {
				const searched = new URL(request.url).searchParams.get("q") !== null;
				return HttpResponse.json({
					...logRuns,
					runs: logRuns.runs.map((run) => ({ ...run, matched: searched ? (run.current ? 0 : 4) : null })),
				});
			}),
		);
		renderWithProviders(<OwnerPage />, { path: "/owner", route: "/owner?tab=logs&q=DXQV6Z" });

		expect(await screen.findByText("4 matches")).toBeInTheDocument();
		expect(screen.getByText("0 matches")).toBeInTheDocument();
	});

	/** An address naming a run that a seventh start has since deleted shows the run going now, not a 404. */
	it("falls back to the run going now for a run it no longer keeps", async () => {
		renderWithProviders(<OwnerPage />, {
			path: "/owner",
			route: "/owner?tab=logs&run=00000000-0000-4000-8000-000000000009",
		});

		expect(await screen.findByText("[READY] Logged in")).toBeInTheDocument();
		expect(screen.getByRole("radio", { name: /Running now/ })).toBeChecked();
	});

	/** Deleting waits out the undo window, so a mistaken click costs nothing. */
	it("deletes a past run only once the undo window has passed", async () => {
		const deleted: string[] = [];
		server.use(
			http.delete("/api/control/logs/:runId", ({ params }) => {
				deleted.push(String(params.runId));
				return new HttpResponse(null, { status: 204 });
			}),
		);
		const user = userEvent.setup();
		const { search } = renderTab("logs");

		await user.click(await screen.findByRole("radio", { name: /30 Jul 2026/ }));
		await user.click(await screen.findByRole("button", { name: "Delete this run’s logs" }));

		expect(screen.queryByRole("radio", { name: /30 Jul 2026/ })).toBeNull();
		expect(search()).not.toContain("run=");
		expect(screen.getByText(/Deleted the logs of the run started/)).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Undo" }));
		expect(await screen.findByRole("radio", { name: /30 Jul 2026/ })).toBeInTheDocument();
		expect(deleted).toEqual([]);
	});

	/** The run going now cannot be deleted from the list, only emptied, and its lines go at once. */
	it("clears the run going now rather than deleting it", async () => {
		const user = userEvent.setup();
		renderTab("logs");

		await screen.findByText("[READY] Logged in");
		await user.click(screen.getByRole("button", { name: "Clear this run’s logs" }));

		expect(screen.queryByText("[READY] Logged in")).toBeNull();
		expect(screen.getByRole("radio", { name: /Running now/ })).toBeInTheDocument();
		expect(screen.getByText(/Deleted the logs of the run going now/)).toBeInTheDocument();
	});

	/** A paused feed, or a past run, otherwise shows what it read until the tab is opened again. */
	it("reads the logs again on demand and says that it has", async () => {
		const user = userEvent.setup();
		renderTab("logs");
		await screen.findByText("[READY] Logged in");

		const latest = { at: "2026-08-01T12:01:00.000Z", level: "info", message: "[HEARTBEAT] Still here", context: {} };
		server.use(
			http.get("/api/analytics/logs", () => HttpResponse.json({ ...logFeed, lines: [latest, ...logFeed.lines] })),
		);
		await user.click(screen.getByRole("button", { name: "Refresh" }));

		expect(await screen.findByText("[HEARTBEAT] Still here")).toBeInTheDocument();
		expect((await screen.findByText(/^Refreshed at /)).closest("[role=status]")).toHaveClass("text-success");
	});

	/** A failed refresh says why, and keeps the lines it already had rather than swapping them for an error page. */
	it("says why a refresh failed, and keeps the lines it had", async () => {
		const user = userEvent.setup();
		renderTab("logs");
		await screen.findByText("[READY] Logged in");

		server.use(
			http.get("/api/analytics/logs", () =>
				HttpResponse.json({ error: { code: "internal", message: "The log store is busy." } }, { status: 500 }),
			),
		);
		await user.click(screen.getByRole("button", { name: "Refresh" }));

		const note = await screen.findByText(
			/^Couldn’t refresh the logs\. The log store is busy\. The lines shown were read at /,
		);
		expect(note.closest("[role=status]")).toHaveClass("text-destructive-text");
		expect(screen.getByText("[READY] Logged in")).toBeInTheDocument();
		expect(screen.queryByText(/^Refreshed at /)).toBeNull();
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

describe("the Shardlens card", () => {
	it("says where the analytics go, links the collector's dashboard and shows what is waiting", async () => {
		renderTab("runtime");

		expect(await screen.findByText(/sending to https:\/\/stats\.example\.com every five seconds/i)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /open the shardlens dashboard/i })).toHaveAttribute(
			"href",
			"https://stats.example.com",
		);
		expect(screen.getByText("network")).toBeInTheDocument();
	});

	/** A send that went and one that did not look the same unless the card says which. */
	it("says what Send now did, whether it worked or not", async () => {
		const user = userEvent.setup();
		renderTab("runtime");

		await user.click(await screen.findByRole("button", { name: /send now/i }));
		expect(await screen.findByText("Sent what was waiting.")).toBeInTheDocument();

		server.use(
			http.post("/api/control/shardlens/send", () =>
				HttpResponse.json({ sent: 0, problem: "network", status: shardlensStatus }),
			),
		);
		await user.click(screen.getByRole("button", { name: /send now/i }));
		expect(await screen.findByText(/could not send \(network\)/i)).toBeInTheDocument();
	});

	/** The collector inside the bot listens on the bot's own machine, so its link has to say it opens nowhere else. */
	it("says the counting stays on the bot's machine, and where its dashboard opens", async () => {
		server.use(
			http.get("/api/control/shardlens", () =>
				HttpResponse.json({ ...shardlensStatus, collector: "http://127.0.0.1:8080", embedded: true }),
			),
		);
		renderTab("runtime");

		expect(await screen.findByText(/inside the bot, so nothing leaves the machine/i)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /open the shardlens dashboard/i })).toHaveAttribute(
			"href",
			"http://127.0.0.1:8080",
		);
		expect(screen.getByText(/opens only on the machine the bot runs on/i)).toBeInTheDocument();
	});

	it("offers nothing to press while it is off", async () => {
		server.use(
			http.get("/api/control/shardlens", () =>
				HttpResponse.json({ ...shardlensStatus, state: "off", collector: null, lastProblem: null }),
			),
		);
		renderTab("runtime");

		expect(await screen.findByText(/nothing is attached and nothing is sent/i)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /send now/i })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /open the shardlens dashboard/i })).not.toBeInTheDocument();
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
