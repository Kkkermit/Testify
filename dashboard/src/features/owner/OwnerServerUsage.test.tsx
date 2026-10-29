import { type OwnerGuildRow, type Paged } from "@testify/shared";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, type JsonBodyType } from "msw";
import { commandFrom, snowflakeFrom } from "@/features/owner/owner.utils";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { expectNoViolations } from "@/test/axe";
import { commandRuns, guildUsage } from "@/test/fixtures/owner";
import { aGuild } from "@/test/fixtures/session";
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
});

describe("one server's usage", () => {
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
	it("drops a member or command filter the API would refuse", () => {
		expect(snowflakeFrom(ALICE)).toBe(ALICE);
		expect(snowflakeFrom("alice")).toBeNull();
		expect(commandFrom("bug-report")).toBe("bug-report");
		expect(commandFrom("$where")).toBeNull();
		expect(commandFrom(null)).toBeNull();
	});
});
