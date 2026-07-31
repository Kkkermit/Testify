import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { levelling } from "@api/routes/levelling";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { deleteLevelSettings, getLevelSettings, saveLevelSettings } from "@database/repositories/levelRepository";
import { type LevelConfigResponse } from "@testify/shared";

jest.mock("@database/repositories/levelRepository", () => ({
	deleteLevelSettings: jest.fn(() => Promise.resolve(true)),
	getLevelSettings: jest.fn(() => Promise.resolve(null)),
	saveLevelSettings: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const ROLE = "300000000000000001";
const OTHER_ROLE = "300000000000000002";
const CHANNEL = "400000000000000001";

const stored = jest.mocked(getLevelSettings);
const saved = jest.mocked(saveLevelSettings);
const audited = jest.mocked(recordAudit);

function app(): Hono<ApiBindings> {
	const guild = { id: GUILD, name: "Test Server" };
	const client = {
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
	instance.route("/guilds/:guildId/levelling", levelling);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(method: string, path: string, body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/levelling${path}`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

async function bodyOf(response: Response): Promise<LevelConfigResponse> {
	return (await response.json()) as LevelConfigResponse;
}

describe("reading the configuration", () => {
	/**
	 * The whole point of returning `normaliseSettings`: the migration off the old single-`roleId` shape happens
	 * in one place, and the web inherits it rather than reimplementing it and drifting.
	 */
	it("migrates an old document exactly as the Discord panel does", async () => {
		stored.mockResolvedValue({ guildId: GUILD, isDisabled: false, roleId: ROLE, multiplier: 3 } as never);

		const config = await bodyOf(await send("GET", ""));

		expect(config.boosts).toEqual([{ roleId: ROLE, multiplier: 3 }]);
		expect(config.enabled).toBe(true);
	});

	it("gives an unconfigured guild the defaults rather than a 404", async () => {
		stored.mockResolvedValue(null);

		const config = await bodyOf(await send("GET", ""));

		expect(config).toMatchObject({ enabled: false, boosts: [], rewards: [], stackRewards: true });
	});
});

describe("patching the configuration", () => {
	/** The stored field is the inverse and has been since the first version; getting it backwards is silent. */
	it("writes isDisabled as the opposite of enabled", async () => {
		await send("PATCH", "", { enabled: true });

		expect(saved).toHaveBeenCalledWith(GUILD, { isDisabled: false });
	});

	it("writes only the fields it was given", async () => {
		await send("PATCH", "", { announce: false });

		expect(saved).toHaveBeenCalledWith(GUILD, { announce: false });
	});

	/** `null` means "reply wherever they were talking", and is a real value rather than an absent one. */
	it("can clear the announcement channel", async () => {
		await send("PATCH", "", { levelUpChannelId: null });

		expect(saved).toHaveBeenCalledWith(GUILD, { levelUpChannelId: null });
	});

	it("refuses a channel id that is not a snowflake", async () => {
		expect((await send("PATCH", "", { levelUpChannelId: "nope" })).status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it("refuses a field the schema does not declare", async () => {
		await send("PATCH", "", { isDisabled: true });

		expect(saved).toHaveBeenCalledWith(GUILD, {});
	});

	/** The overview's recent-changes card shows this line, so it has to say what happened. */
	it("records what changed, in words", async () => {
		await send("PATCH", "", { enabled: false });

		expect(audited).toHaveBeenCalledWith(
			expect.objectContaining({ action: "levelling.update", summary: "Turned levelling off", actorTag: "someone" }),
		);
	});

	it("records the guild the change was made in", async () => {
		await send("PATCH", "", { enabled: true });

		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ guildId: GUILD, actorId: OWNER }));
	});
});

describe("the boost list", () => {
	it("replaces the whole list in one write", async () => {
		const boosts = [{ roleId: ROLE, multiplier: 2 }];
		await send("PUT", "/boosts", boosts);

		expect(saved).toHaveBeenCalledWith(GUILD, { boosts });
	});

	it("accepts an empty list, which is how the last boost is removed", async () => {
		await send("PUT", "/boosts", []);

		expect(saved).toHaveBeenCalledWith(GUILD, { boosts: [] });
	});

	/** The same limit the Discord panel enforces. The web accepting a sixth is how the two surfaces disagree. */
	it("refuses more boosts than the panel can render", async () => {
		const tooMany = Array.from({ length: 6 }, (_, index) => ({
			roleId: `30000000000000000${String(index)}`,
			multiplier: 2,
		}));

		expect((await send("PUT", "/boosts", tooMany)).status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it("refuses a multiplier outside the range", async () => {
		expect((await send("PUT", "/boosts", [{ roleId: ROLE, multiplier: 99 }])).status).toBe(400);
		expect((await send("PUT", "/boosts", [{ roleId: ROLE, multiplier: 0 }])).status).toBe(400);
	});

	/** Two entries for one role would give the same question two answers. */
	it("refuses the same role twice", async () => {
		const response = await send("PUT", "/boosts", [
			{ roleId: ROLE, multiplier: 2 },
			{ roleId: ROLE, multiplier: 4 },
		]);

		expect(response.status).toBe(400);
	});
});

describe("the reward list", () => {
	it("stores rewards sorted, so every reader gets them in order", async () => {
		await send("PUT", "/rewards", [
			{ level: 20, roleId: OTHER_ROLE },
			{ level: 5, roleId: ROLE },
		]);

		expect(saved).toHaveBeenCalledWith(GUILD, {
			rewards: [
				{ level: 5, roleId: ROLE },
				{ level: 20, roleId: OTHER_ROLE },
			],
		});
	});

	it("refuses a level beyond the cap", async () => {
		expect((await send("PUT", "/rewards", [{ level: 9_999, roleId: ROLE }])).status).toBe(400);
	});

	it("refuses two rewards for the same level", async () => {
		const response = await send("PUT", "/rewards", [
			{ level: 5, roleId: ROLE },
			{ level: 5, roleId: OTHER_ROLE },
		]);

		expect(response.status).toBe(400);
	});

	/** A guild may deliberately point two levels at one role, and that is not the same mistake. */
	it("allows one role to be the reward for two levels", async () => {
		const response = await send("PUT", "/rewards", [
			{ level: 5, roleId: ROLE },
			{ level: 10, roleId: ROLE },
		]);

		expect(response.status).toBe(200);
	});
});

describe("the ignore lists", () => {
	it("writes both lists together", async () => {
		await send("PUT", "/ignores", { channelIds: [CHANNEL], roleIds: [ROLE] });

		expect(saved).toHaveBeenCalledWith(GUILD, { ignoredChannelIds: [CHANNEL], ignoredRoleIds: [ROLE] });
	});

	it("refuses more than the panel's limits", async () => {
		const channels = Array.from({ length: 11 }, (_, index) => `40000000000000000${String(index)}`);

		expect((await send("PUT", "/ignores", { channelIds: channels, roleIds: [] })).status).toBe(400);
	});

	it("needs both lists, so a partial body cannot silently clear one", async () => {
		expect((await send("PUT", "/ignores", { channelIds: [CHANNEL] })).status).toBe(400);
	});
});

describe("clearing the configuration", () => {
	it("deletes the settings", async () => {
		await send("DELETE", "");

		expect(jest.mocked(deleteLevelSettings)).toHaveBeenCalledWith(GUILD);
	});

	/** Wiping settings and wiping everyone's XP are very different things, so the answer says which happened. */
	it("says out loud that nobody lost their XP", async () => {
		const body = (await (await send("DELETE", "")).json()) as { message: string };

		expect(body.message).toMatch(/already earned/i);
	});
});

describe("the audit record", () => {
	/** The change did happen. Failing the request over the bookkeeping would be the worse answer. */
	it("still succeeds when the audit write fails", async () => {
		audited.mockRejectedValueOnce(new Error("mongo is down"));

		expect((await send("PATCH", "", { enabled: true })).status).toBe(200);
	});

	it("keeps before and after to the field that changed", async () => {
		stored.mockResolvedValue({ guildId: GUILD, isDisabled: true } as never);

		await send("PATCH", "", { enabled: true });

		const entry = audited.mock.calls[0]?.[0];
		expect(Object.keys(entry?.before as object)).toEqual(["enabled"]);
		expect(Object.keys(entry?.after as object)).toEqual(["enabled"]);
	});
});
