import { ChannelType, Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { sticky } from "@api/routes/sticky";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { listSticky, removeSticky, setSticky } from "@database/repositories/settingsRepository";
import { STICKY_LIMITS, type StickyList } from "@testify/shared";

jest.mock("@database/repositories/settingsRepository", () => ({
	listSticky: jest.fn(() => Promise.resolve([])),
	removeSticky: jest.fn(() => Promise.resolve(true)),
	setSticky: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const CHANNEL = "400000000000000001";
const ELSEWHERE = "400000000000000009";

const listed = jest.mocked(listSticky);
const saved = jest.mocked(setSticky);
const removed = jest.mocked(removeSticky);
const audited = jest.mocked(recordAudit);

function entry(channelId: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return { guildId: GUILD, channelId, message: "Read the rules", cap: 5, count: 0, lastMessageId: null, ...overrides };
}

function app(): Hono<ApiBindings> {
	const channel = {
		id: CHANNEL,
		type: ChannelType.GuildText,
		isTextBased: () => true,
		permissionsFor: () => ({ has: () => true }),
	};
	const guild = {
		id: GUILD,
		name: "Test Server",
		members: { me: {} },
		channels: { cache: new Collection<string, unknown>([[CHANNEL, channel]]) },
	};
	const client = {
		user: { id: "200000000000000002" },
		guilds: { cache: new Collection<string, unknown>([[GUILD, guild]]) },
		isOwner: (id: string) => id === OWNER,
		logger: { error: jest.fn() },
	} as unknown as TestifyClient;

	const instance = new Hono<ApiBindings>();
	instance.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", {} as Env);
		context.set("oauth", null);
		context.set("session", { _id: "s", userId: OWNER, username: "someone" } as never);
		await next();
	});
	instance.route("/guilds/:guildId/sticky", sticky);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(method: string, path = "", body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/sticky${path}`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	listed.mockResolvedValue([]);
	removed.mockResolvedValue(true);
});

describe("GET /sticky", () => {
	it("reports the limit alongside the entries, so the form knows when to stop", async () => {
		const body = (await (await send("GET")).json()) as StickyList;

		expect(body).toEqual({ limit: STICKY_LIMITS.maxPerGuild, entries: [] });
	});

	it("says which entries have a message out there already", async () => {
		listed.mockResolvedValue([entry(CHANNEL, { lastMessageId: "999" })] as never);

		const body = (await (await send("GET")).json()) as StickyList;

		expect(body.entries[0]).toMatchObject({ channelId: CHANNEL, posted: true, canSend: true });
	});

	/** The bot losing Send Messages is the usual reason a sticky stops appearing, and the page has to show it. */
	it("reports a channel the bot can no longer post in", async () => {
		listed.mockResolvedValue([entry(ELSEWHERE)] as never);

		const body = (await (await send("GET")).json()) as StickyList;

		expect(body.entries[0]?.canSend).toBe(false);
	});
});

describe("PUT /sticky", () => {
	it("stores the entry and answers with the whole list", async () => {
		const response = await send("PUT", "", { channelId: CHANNEL, message: "Read the rules", cap: 5 });

		expect(response.status).toBe(200);
		expect(saved).toHaveBeenCalledWith(GUILD, CHANNEL, "Read the rules", 5);
	});

	/** A channel id from another server would otherwise write a row the bot can never post. */
	it("refuses a channel that is not in this server", async () => {
		const response = await send("PUT", "", { channelId: ELSEWHERE, message: "hi", cap: 5 });

		expect(response.status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it("refuses a new entry once the server is full", async () => {
		listed.mockResolvedValue(
			Array.from({ length: STICKY_LIMITS.maxPerGuild }, (_, i) => entry(`50000000000000000${String(i)}`)) as never,
		);

		const response = await send("PUT", "", { channelId: CHANNEL, message: "hi", cap: 5 });

		expect(response.status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	/** Being full must not block editing what is already there, or a full server could never fix a typo. */
	it("still edits an existing entry when the server is full", async () => {
		listed.mockResolvedValue([
			entry(CHANNEL),
			...Array.from({ length: STICKY_LIMITS.maxPerGuild - 1 }, (_, i) => entry(`40000000000000001${String(i)}`)),
		] as never);

		const response = await send("PUT", "", { channelId: CHANNEL, message: "Edited", cap: 5 });

		expect(response.status).toBe(200);
		expect(saved).toHaveBeenCalled();
	});

	it("refuses HTML in the message", async () => {
		const response = await send("PUT", "", { channelId: CHANNEL, message: "<script>x</script>", cap: 5 });

		expect(response.status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it("tells a create from an edit in the audit record", async () => {
		await send("PUT", "", { channelId: CHANNEL, message: "hi", cap: 5 });
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "sticky.create" }));

		jest.clearAllMocks();
		listed.mockResolvedValue([entry(CHANNEL)] as never);

		await send("PUT", "", { channelId: CHANNEL, message: "hi", cap: 5 });
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "sticky.update" }));
	});
});

describe("DELETE /sticky/:channelId", () => {
	it("removes the entry and answers with the list", async () => {
		const response = await send("DELETE", `/${CHANNEL}`);

		expect(response.status).toBe(200);
		expect(removed).toHaveBeenCalledWith(GUILD, CHANNEL);
	});

	/** Two tabs open, both pressing Remove: the second finds nothing, which is a 404 rather than a 500. */
	it("answers 404 when there was nothing to remove", async () => {
		removed.mockResolvedValue(false);

		const response = await send("DELETE", `/${CHANNEL}`);

		expect(response.status).toBe(404);
		expect(audited).not.toHaveBeenCalled();
	});

	it("refuses a channel id that is not a snowflake", async () => {
		const response = await send("DELETE", "/not-an-id");

		expect(response.status).toBe(400);
		expect(removed).not.toHaveBeenCalled();
	});

	it("names the channel in the audit record", async () => {
		await send("DELETE", `/${CHANNEL}`);

		expect(audited).toHaveBeenCalledWith(
			expect.objectContaining({ action: "sticky.delete", summary: expect.stringContaining(CHANNEL) }),
		);
	});
});
