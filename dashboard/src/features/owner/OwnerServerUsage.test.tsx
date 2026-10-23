import { type OwnerGuildRow, type Paged } from "@testify/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, type JsonBodyType } from "msw";
import {
	commandFrom,
	formatMs,
	guildFilterFrom,
	guildSortFrom,
	runName,
	searchWith,
	snowflakeFrom,
} from "@/features/owner/owner.utils";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { expectNoViolations } from "@/test/axe";
import { aGuild, commandRuns, guildUsage } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const ALICE = "800000000000000001";
const DRILL_DOWN = `/owner?tab=usage&guild=${aGuild.id}`;

function renderAt(route: string) {
	return renderWithProviders(<OwnerPage />, { path: "/owner", route });
}

/** Records every query string a GET to `path` was sent with, answering as the default handler would. */
function watch(path: string, body: JsonBodyType): URLSearchParams[] {
	const seen: URLSearchParams[] = [];
	server.use(
		http.get(path, ({ request }) => {
			seen.push(new URL(request.url).searchParams);
			return HttpResponse.json(body);
		}),
	);
	return seen;
}

const row: OwnerGuildRow = {
	id: aGuild.id,
	name: aGuild.name,
	iconUrl: null,
	memberCount: 1_234,
	joinedAt: "2026-01-01T00:00:00.000Z",
	configured: [],
	commands: 77,
	dashboardViews: 5,
};
const onePage: Paged<OwnerGuildRow> = { items: [row], total: 1, page: 1, perPage: 25 };

describe("the owner's server list", () => {
	it("shows each server's commands and dashboard use", async () => {
		watch("/api/owner/guilds", onePage);
		renderAt("/owner?tab=overview");

		expect(await screen.findByRole("columnheader", { name: "Commands, 30d" })).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: "Dashboard, 30d" })).toBeInTheDocument();
		expect(screen.getByText("77")).toBeInTheDocument();
		expect(screen.getByText("5")).toBeInTheDocument();
	});

	it("asks for the order chosen, from the first page", async () => {
		const seen = watch("/api/owner/guilds", onePage);
		renderAt("/owner?tab=overview&page=3");
		await screen.findByRole("table");

		await userEvent.selectOptions(screen.getByLabelText("Sort by"), "Newly joined");

		await waitFor(() => {
			expect(seen.at(-1)?.get("sort")).toBe("newest");
		});
		expect(seen.at(-1)?.get("page")).toBe("1");
	});

	it("offers every order the API takes, labelled for a person", async () => {
		watch("/api/owner/guilds", onePage);
		renderAt("/owner?tab=overview");

		const options = within(await screen.findByLabelText("Sort by")).getAllByRole("option");
		expect(options.map((option) => option.textContent)).toEqual([
			"Most members",
			"Fewest members",
			"Newly joined",
			"Joined longest ago",
			"Uses Testify the most",
			"Uses Testify the least",
			"Uses the dashboard the most",
			"Name, A to Z",
		]);
	});

	/** Debounced, so a five-letter name is one request rather than five. */
	it("searches by what was typed, once it settles", async () => {
		const seen = watch("/api/owner/guilds", onePage);
		renderAt("/owner?tab=overview");
		await screen.findByRole("table");

		await userEvent.type(screen.getByLabelText("Search servers"), "test");

		await waitFor(() => {
			expect(seen.at(-1)?.get("q")).toBe("test");
		});
		expect(seen.filter((query) => query.has("q")).length).toBeLessThan(4);
	});

	it("says when a search matched nothing, rather than showing an empty table", async () => {
		watch("/api/owner/guilds", { items: [], total: 0, page: 1, perPage: 25 });
		renderAt("/owner?tab=overview&search=zzz");

		expect(await screen.findByText("No server matches that search.")).toBeInTheDocument();
	});

	/** A server that never ran a command is a candidate for leaving, as long as it has had time to try. */
	it("asks only for servers with no commands when the box is ticked, and shows when each joined", async () => {
		const seen = watch("/api/owner/guilds", onePage);
		renderAt("/owner?tab=overview&page=2");
		await screen.findByRole("table");

		await userEvent.click(screen.getByLabelText("Only servers with no commands in the last 30 days"));

		await waitFor(() => {
			expect(seen.at(-1)?.get("filter")).toBe("inactive");
		});
		expect(seen.at(-1)?.get("page")).toBe("1");
		expect(screen.getByRole("columnheader", { name: "Joined" }).className).not.toMatch(/\bhidden\b/);
	});

	it("says so when every server has run a command", async () => {
		watch("/api/owner/guilds", { items: [], total: 0, page: 1, perPage: 25 });
		renderAt("/owner?tab=overview&filter=inactive");

		expect(await screen.findByText("Every server has run a command in the last 30 days.")).toBeInTheDocument();
	});

	it("links a server's detail to who ran what there", async () => {
		watch("/api/owner/guilds", onePage);
		renderAt(`/owner?tab=overview&server=${aGuild.id}`);

		const link = await screen.findByRole("link", { name: "See who ran what" });
		expect(link).toHaveAttribute("href", expect.stringContaining(`tab=usage&guild=${aGuild.id}`));
	});
});

describe("one server's usage", () => {
	it("names the server and what was run there", async () => {
		renderAt(DRILL_DOWN);

		expect(await screen.findByRole("heading", { level: 2, name: aGuild.name })).toBeInTheDocument();
		expect(screen.getByText("Members who ran one")).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Commands run here" })).toBeInTheDocument();
	});

	it("lists who ran commands, with their busiest ones", async () => {
		renderAt(DRILL_DOWN);

		const table = await screen.findByRole("table", { name: /Members of Test Server/ });
		expect(within(table).getByText("alice")).toBeInTheDocument();
		expect(within(table).getByText("bob")).toBeInTheDocument();
		expect(within(table).getByText("/rank · 500")).toBeInTheDocument();
		expect(within(table).getByText("+1 more")).toBeInTheDocument();
		expect(within(table).getByText("3 failed")).toBeInTheDocument();
	});

	it("lists each run with its subcommand, channel and outcome", async () => {
		renderAt(DRILL_DOWN);

		const table = await screen.findByRole("table", { name: /Commands run in Test Server/ });
		expect(within(table).getByText("/music play")).toBeInTheDocument();
		expect(within(table).getByText("#general")).toBeInTheDocument();
		expect(within(table).getByText("Unknown channel")).toBeInTheDocument();
		expect(within(table).getByText("Failed")).toBeInTheDocument();
		expect(within(table).getByText("Worked")).toBeInTheDocument();
	});

	/** The point of the drill-down: press a name and see only what that person ran. */
	it("narrows the runs to a member when their name is pressed, and back", async () => {
		const seen = watch("/api/analytics/guilds/:guildId/runs", { items: [], total: 0, page: 1, perPage: 25 });
		renderAt(DRILL_DOWN);

		const alice = await screen.findByRole("button", { name: /^alice/ });
		await userEvent.click(alice);

		await waitFor(() => {
			expect(seen.at(-1)?.get("userId")).toBe(ALICE);
		});
		expect(screen.getByRole("button", { name: /^alice/, pressed: true })).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: /Show everyone’s runs/ }));

		await waitFor(() => {
			expect(seen.at(-1)?.has("userId")).toBe(false);
		});
	});

	/** The reference is what the error was logged under, so following it lands on that failure's lines. */
	it("links a failed run to its lines on the Logs tab", async () => {
		renderAt(DRILL_DOWN);

		const link = await screen.findByRole("link", { name: /Failed AB12CD/ });
		expect(link).toHaveAttribute("href", expect.stringMatching(/[?&]tab=logs\b/));
		expect(link).toHaveAttribute("href", expect.stringMatching(/[?&]q=AB12CD\b/));

		await userEvent.click(link);

		expect(await screen.findByLabelText("Search the log")).toHaveValue("AB12CD");
	});

	/** A refusal was never logged as a bug, so there is nothing to link to. */
	it("leaves a failure with no reference as a plain badge", async () => {
		watch("/api/analytics/guilds/:guildId/runs", {
			items: [{ ...commandRuns[0], reference: null }],
			total: 1,
			page: 1,
			perPage: 25,
		});
		renderAt(DRILL_DOWN);

		await screen.findByRole("table", { name: /Commands run in Test Server/ });
		expect(screen.queryByRole("link", { name: /Failed/ })).toBeNull();
		expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);
	});

	it("opens the blacklist with the member's ID filled in, ready for a reason", async () => {
		renderAt(DRILL_DOWN);

		await userEvent.click(await screen.findByRole("button", { name: "Block alice from Testify" }));

		expect(await screen.findByLabelText("User ID")).toHaveValue(ALICE);
		expect(screen.getByLabelText("Reason (optional)")).toHaveFocus();
		// Filling the form is not blocking: the owner still has to press it.
		expect(screen.getByRole("button", { name: "Block them" })).toBeEnabled();
	});

	it("narrows the runs to one command", async () => {
		const seen = watch("/api/analytics/guilds/:guildId/runs", { items: [], total: 0, page: 1, perPage: 25 });
		renderAt(DRILL_DOWN);

		await userEvent.selectOptions(await screen.findByLabelText("Command"), "/music");

		await waitFor(() => {
			expect(seen.at(-1)?.get("command")).toBe("music");
		});
		expect(await screen.findByText("No runs match.")).toBeInTheDocument();
	});

	it("searches the members by what was typed", async () => {
		const seen = watch("/api/analytics/guilds/:guildId/members", { items: [], total: 0, page: 1, perPage: 25 });
		renderAt(DRILL_DOWN);

		await userEvent.type(await screen.findByLabelText("Search members"), "ali");

		await waitFor(() => {
			expect(seen.at(-1)?.get("q")).toBe("ali");
		});
		expect(await screen.findByText("Nobody matches that search.")).toBeInTheDocument();
	});

	/** Runs are kept for 30 days, so a 90-day window has to say the member half covers less. */
	it("says when who ran what covers less than the window", async () => {
		watch("/api/analytics/guilds/:guildId", { ...guildUsage, days: 90, memberDays: 30 });
		renderAt(`${DRILL_DOWN}&days=90`);

		expect(await screen.findByText(/kept for 30 days/)).toBeInTheDocument();
	});

	it("does not mention the shorter keep when the window fits inside it", async () => {
		renderAt(DRILL_DOWN);
		await screen.findByRole("heading", { level: 2, name: aGuild.name });

		expect(screen.queryByText(/kept for 30 days/)).toBeNull();
	});

	it("leads back to every server, dropping the drill-down's filters", async () => {
		renderAt(`${DRILL_DOWN}&member=${ALICE}&command=rank`);

		const back = await screen.findByRole("link", { name: "All servers" });
		const href = back.getAttribute("href") ?? "";
		expect(href).toContain("tab=usage");
		expect(href).not.toMatch(/guild=|member=|command=/);
	});

	/** A bad id in a pasted link falls back to every server rather than asking the API for a 400. */
	it("treats a guild id that is not one as no guild at all", async () => {
		renderAt("/owner?tab=usage&guild=nonsense");

		expect(await screen.findByRole("heading", { name: "Busiest servers" })).toBeInTheDocument();
	});

	it("has no automatically detectable violations", async () => {
		const { container } = renderAt(DRILL_DOWN);
		await screen.findByRole("table", { name: /Commands run in Test Server/ });

		await expectNoViolations(container);
	});
});

describe("the owner console's URL readers", () => {
	it("sorts largest first unless told otherwise", () => {
		expect(guildSortFrom(null)).toBe("members");
		expect(guildSortFrom("random")).toBe("members");
		expect(guildSortFrom("dashboard")).toBe("dashboard");
	});

	it("drops a member or command filter the API would refuse", () => {
		expect(snowflakeFrom(ALICE)).toBe(ALICE);
		expect(snowflakeFrom("alice")).toBeNull();
		expect(commandFrom("bug-report")).toBe("bug-report");
		expect(commandFrom("$where")).toBeNull();
		expect(commandFrom(null)).toBeNull();
	});

	it("shows every server unless asked for the inactive ones", () => {
		expect(guildFilterFrom(null)).toBe("all");
		expect(guildFilterFrom("everything")).toBe("all");
		expect(guildFilterFrom("inactive")).toBe("inactive");
	});

	it("reads a duration in milliseconds under a second and in seconds above it", () => {
		expect(formatMs(85)).toBe("85 ms");
		expect(formatMs(999)).toBe("999 ms");
		expect(formatMs(4_200)).toBe("4.2 s");
	});

	it("writes a run the way it was typed", () => {
		expect(runName({ command: "music", subcommand: "play" })).toBe("/music play");
		expect(runName({ command: "rank", subcommand: null })).toBe("/rank");
	});

	it("changes some of the query and keeps the rest", () => {
		const current = new URLSearchParams("tab=usage&days=7&guild=1");

		expect(searchWith(current, { guild: null, member: "2" })).toBe("?tab=usage&days=7&member=2");
	});
});
