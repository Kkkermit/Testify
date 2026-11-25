import { Collection } from "discord.js";
import { Hono } from "hono";
import { answerLikeTheApp, withSession } from "../helpers/apiHarness";
import { type ApiBindings } from "@api/context";
import { owner } from "@api/routes/owner";
import { type TestifyClient } from "@core/client";
import { databaseConnected } from "@database/connection";
import { getAuditLogConfig } from "@database/repositories/auditLogRepository";
import { getCounting } from "@database/repositories/countingRepository";
import { getLevelSettings } from "@database/repositories/levelRepository";
import { getWelcome } from "@database/repositories/welcomeRepository";
import { AnalyticsUnavailable, guildActivity } from "@lib/bot";
import { type OwnerGuildPage } from "@testify/shared";

jest.mock("@database/connection", () => ({ databaseConnected: jest.fn(() => true) }));
jest.mock("@database/repositories/levelRepository", () => ({ getLevelSettings: jest.fn(() => Promise.resolve(null)) }));
jest.mock("@database/repositories/auditLogRepository", () => ({
	getAuditLogConfig: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/countingRepository", () => ({
	getCounting: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/welcomeRepository", () => ({
	getWelcome: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@lib/bot", () => ({ ...jest.requireActual<object>("@lib/bot"), guildActivity: jest.fn() }));

const quiet = (): { commands: Map<string, number>; dashboard: Map<string, number> } => ({
	commands: new Map(),
	dashboard: new Map(),
});

const OWNER = "100000000000000001";
const MANAGER = "100000000000000002";

interface Spec {
	name: string;
	memberCount: number;
	joined: string;
}

function guildsOf(specs: Spec[]): Collection<string, unknown> {
	return new Collection(
		specs.map((spec, index) => {
			const id = `90000000000000000${String(index)}`;
			const joinedAt = new Date(spec.joined);
			return [id, { id, ...spec, iconURL: () => null, joinedAt, joinedTimestamp: joinedAt.getTime() }];
		}),
	);
}

function fleet(size: number): Collection<string, unknown> {
	return guildsOf(
		Array.from({ length: size }, (_, index) => ({
			name: `Server ${String(index)}`,
			memberCount: (index + 1) * 100,
			joined: "2026-01-01T00:00:00.000Z",
		})),
	);
}

function appFor(size: number | Collection<string, unknown>, userId = OWNER): Hono<ApiBindings> {
	const client = {
		guilds: { cache: typeof size === "number" ? fleet(size) : size },
		isOwner: (id: string) => id === OWNER,
		commands: { size: 76 },
		startedAt: Date.now() - 60_000,
	} as unknown as TestifyClient;

	const app = new Hono<ApiBindings>();
	withSession(app, client, { userId });
	app.route("/owner", owner);
	answerLikeTheApp(app);

	return app;
}

beforeEach(() => {
	jest.mocked(databaseConnected).mockReturnValue(true);
	jest.mocked(getLevelSettings).mockResolvedValue(null);
	jest.mocked(getAuditLogConfig).mockResolvedValue(null);
	jest.mocked(getCounting).mockResolvedValue(null);
	jest.mocked(getWelcome).mockResolvedValue(null);
	jest.mocked(guildActivity).mockResolvedValue(quiet());
});

describe("the owner stats", () => {
	/** The console can leave guilds and blacklist people; a manager must not learn it is here. */
	it("is a 404 for anyone who is not the bot owner", async () => {
		expect((await appFor(1, MANAGER).request("/owner/stats")).status).toBe(404);
	});
});

describe("the owner guild list", () => {
	/** The question this screen exists to answer: which of my servers has never configured anything. */
	it("says a server has nothing configured when it has nothing configured", async () => {
		const body = (await (await appFor(1).request("/owner/guilds")).json()) as OwnerGuildPage;

		expect(body.items[0]?.configured).toEqual([]);
	});

	/** Levelling with a row in the database but switched off is not configured, it is switched off. */
	it("does not count a disabled feature as configured", async () => {
		jest.mocked(getLevelSettings).mockResolvedValue({ isDisabled: true } as never);

		const body = (await (await appFor(1).request("/owner/guilds")).json()) as OwnerGuildPage;

		expect(body.items[0]?.configured).toEqual([]);
	});

	it("refuses a page number that is not one", async () => {
		expect((await appFor(1).request("/owner/guilds?page=-1")).status).toBe(400);
	});

	/** The list is how the owner reaches a server, so Shardlens being away costs the counts and never the list. */
	it("still lists every server while Shardlens cannot be read, and says why the counts are missing", async () => {
		jest.mocked(guildActivity).mockRejectedValue(new AnalyticsUnavailable("unreachable"));

		const body = (await (await appFor(2).request("/owner/guilds")).json()) as OwnerGuildPage;
		const inactive = (await (await appFor(2).request("/owner/guilds?filter=inactive")).json()) as OwnerGuildPage;

		expect(body.analytics).toBe("unreachable");
		expect(body.items.map((row) => [row.commands, row.dashboardViews])).toEqual([
			[null, null],
			[null, null],
		]);
		// Nobody can be told apart as inactive without the counts, and listing everybody would say they all were.
		expect(inactive.items).toEqual([]);
	});
});

describe("sorting and searching the owner guild list", () => {
	// Joined, size and name each put these three in a different order, so every sort is told apart.
	const three = (): Collection<string, unknown> =>
		guildsOf([
			{ name: "Bravo", memberCount: 50, joined: "2026-03-01T00:00:00.000Z" },
			{ name: "alpha", memberCount: 900, joined: "2026-01-01T00:00:00.000Z" },
			{ name: "Charlie", memberCount: 300, joined: "2026-05-01T00:00:00.000Z" },
		]);

	async function names(query: string, guilds = three()): Promise<string[]> {
		const body = (await (await appFor(guilds).request(`/owner/guilds${query}`)).json()) as OwnerGuildPage;
		return body.items.map((guild) => guild.name);
	}

	it.each([
		["members", ["alpha", "Charlie", "Bravo"]],
		["fewest", ["Bravo", "Charlie", "alpha"]],
		["newest", ["Charlie", "Bravo", "alpha"]],
		["oldest", ["alpha", "Bravo", "Charlie"]],
		["name", ["alpha", "Bravo", "Charlie"]],
	])("sorts by %s", async (sort, expected) => {
		expect(await names(`?sort=${sort}`)).toEqual(expected);
	});

	/** A pasted ID is that server and no other, even though its digits appear inside other IDs. */
	it("finds a server by its exact ID", async () => {
		expect(await names("?q=900000000000000001")).toEqual(["alpha"]);
		expect(await names("?q=90000000000000000")).toEqual([]);
	});

	/** Equally quiet servers come oldest first, since the bot has had longest to be used there. */
	it("puts the server that ran the fewest commands first, and the oldest of equals", async () => {
		expect(await names("?sort=quietest")).toEqual(["alpha", "Bravo", "Charlie"]);

		jest.mocked(guildActivity).mockResolvedValue({ ...quiet(), commands: new Map([["900000000000000001", 3]]) });

		expect(await names("?sort=quietest")).toEqual(["Bravo", "Charlie", "alpha"]);
	});

	it("refuses a filter it does not offer", async () => {
		expect((await appFor(three()).request("/owner/guilds?filter=everything")).status).toBe(400);
	});

	it("refuses a sort it does not offer", async () => {
		expect((await appFor(three()).request("/owner/guilds?sort=random")).status).toBe(400);
	});
});
