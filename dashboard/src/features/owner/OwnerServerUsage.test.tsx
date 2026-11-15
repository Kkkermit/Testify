import { type OwnerGuildPage, type OwnerGuildRow } from "@testify/shared";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, type JsonBodyType } from "msw";
import { collectorPage, snowflakeFrom } from "@/features/owner/owner.utils";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { expectNoViolations } from "@/test/axe";
import { guildUsage, usageReport } from "@/test/fixtures/owner";
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
const onePage: OwnerGuildPage = { items: [row], total: 1, page: 1, perPage: 25, analytics: null };

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

	/** A blank count is Shardlens being away, which must never read as nobody using the server. */
	it("shows a dash for each count Shardlens could not give, and says why", async () => {
		watch("/api/owner/guilds", {
			...onePage,
			items: [{ ...row, commands: null, dashboardViews: null }],
			analytics: "refused",
		});
		renderAt("/owner?tab=overview");
		const table = await screen.findByRole("table");

		expect(await screen.findByText(/Shardlens refused the bot’s read key/)).toBeInTheDocument();
		expect(table.textContent).toContain("—");
		expect(table.textContent).not.toContain("77");
	});
});

describe("one server's usage", () => {
	/** Prefix runs by name and dashboard figures come from raw events, which Shardlens keeps less long than its counts. */
	it("says how far back the event figures reach when the window is longer", async () => {
		watch("/api/analytics/guilds/:guildId", { ...guildUsage, days: 90, detailDays: 30 });
		renderAt(`${DRILL_DOWN}&days=90`);

		expect(await screen.findByText(/reach back 30 days/)).toBeInTheDocument();
	});

	it("does not mention it when the window fits inside what is kept", async () => {
		renderAt(DRILL_DOWN);
		await screen.findByRole("heading", { level: 2, name: aGuild.name });

		expect(screen.queryByText(/reach back/)).toBeNull();
	});

	/** Who ran what lives on the collector, behind its own sign-in, so the console points there rather than showing it. */
	it("links who ran what and this server to Shardlens, in a new tab", async () => {
		renderAt(DRILL_DOWN);

		const activity = await screen.findByRole("link", { name: /Who ran what, on Shardlens/ });
		const server = screen.getByRole("link", { name: /This server on Shardlens/ });
		expect(activity).toHaveAttribute("href", "https://stats.example.com/activity");
		expect(server).toHaveAttribute("href", `https://stats.example.com/servers/${aGuild.id}`);
		expect(activity).toHaveAttribute("target", "_blank");
		expect(activity).toHaveAttribute("rel", "noreferrer");
	});

	/** A missing key is a setting, not an outage, so only an outage or a refused key offers to try again. */
	it("says why Shardlens could not be read, and offers a retry only when one could help", async () => {
		const refuse = (code: string): void => {
			server.use(
				http.get("/api/analytics/guilds/:guildId", () =>
					HttpResponse.json({ error: { code, message: "x" } }, { status: 503 }),
				),
			);
		};

		refuse("analytics_off");
		const { unmount } = renderAt(DRILL_DOWN);
		expect(await screen.findByText(/has no read key for it yet/)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
		unmount();

		refuse("analytics_unreachable");
		renderAt(DRILL_DOWN);
		expect(await screen.findByText(/Shardlens is not answering/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
	});

	/** A bad id in a pasted link falls back to every server rather than asking the API for a 400. */
	it("treats a guild id that is not one as no guild at all", async () => {
		renderAt("/owner?tab=usage&guild=nonsense");

		expect(await screen.findByRole("heading", { name: "Busiest servers" })).toBeInTheDocument();
	});

	it("has no automatically detectable violations", async () => {
		const { container } = renderAt(DRILL_DOWN);
		await screen.findByRole("link", { name: /This server on Shardlens/ });

		await expectNoViolations(container);
	});
});

describe("the bot-wide usage", () => {
	it("links who ran what to Shardlens beside the figures", async () => {
		renderAt("/owner?tab=usage");

		expect(await screen.findByRole("link", { name: /Who ran what, on Shardlens/ })).toHaveAttribute(
			"href",
			`${usageReport.collector}/activity`,
		);
		expect(screen.queryByRole("link", { name: /This server on Shardlens/ })).toBeNull();
	});
});

describe("the owner console's URL readers", () => {
	it("drops a guild id the API would refuse", () => {
		expect(snowflakeFrom(ALICE)).toBe(ALICE);
		expect(snowflakeFrom("alice")).toBeNull();
	});

	/** The collector's address reaches an href, so anything but an http(s) origin is never a link. */
	it("links only an http or https origin", () => {
		expect(collectorPage("https://stats.example.com", "/activity")).toBe("https://stats.example.com/activity");
		expect(collectorPage("http://localhost:8787")).toBe("http://localhost:8787");
		for (const bad of [
			"ftp://stats.example.com",
			"https://stats.example.com/x",
			"data:text/html,x",
			"",
			"https://a b",
		]) {
			expect(collectorPage(bad)).toBeNull();
		}
	});
});
