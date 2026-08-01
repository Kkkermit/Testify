import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { settings } from "@api/routes/settings";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import {
	disableAntiLink,
	disableCounting,
	getAntiLink,
	getAutoRoles,
	getCounting,
	getPrefixConfig,
	getVoiceCounter,
	resetCount,
	setAntiLink,
	setAutoRoles,
	setCounting,
	setPrefix,
	setPrefixEnabled,
	setVoiceCounter,
} from "@database/repositories/settingsRepository";
import { type ServerSettings } from "@testify/shared";

jest.mock("@database/repositories/settingsRepository", () => ({
	getPrefixConfig: jest.fn(() => Promise.resolve({ prefix: "t?", isEnabled: true })),
	setPrefix: jest.fn(() => Promise.resolve("!")),
	setPrefixEnabled: jest.fn(() => Promise.resolve({ prefix: "t?", isEnabled: false })),
	getAntiLink: jest.fn(() => Promise.resolve(null)),
	setAntiLink: jest.fn(() => Promise.resolve({})),
	disableAntiLink: jest.fn(() => Promise.resolve(true)),
	getAutoRoles: jest.fn(() => Promise.resolve(null)),
	setAutoRoles: jest.fn(() => Promise.resolve({})),
	getCounting: jest.fn(() => Promise.resolve(null)),
	setCounting: jest.fn(() => Promise.resolve({})),
	disableCounting: jest.fn(() => Promise.resolve(true)),
	resetCount: jest.fn(() => Promise.resolve()),
	getVoiceCounter: jest.fn(() => Promise.resolve(null)),
	setVoiceCounter: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const CHANNEL = "400000000000000001";
const ROLE = "300000000000000001";

function app(): Hono<ApiBindings> {
	const client = {
		guilds: { cache: new Collection<string, unknown>([[GUILD, { id: GUILD, name: "Test Server" }]]) },
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
	instance.route("/guilds/:guildId/settings", settings);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(method: string, path = "", body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/settings${path}`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

async function read(): Promise<ServerSettings> {
	return (await (await send("GET")).json()) as ServerSettings;
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getPrefixConfig).mockResolvedValue({ prefix: "t?", isEnabled: true });
	jest.mocked(getAntiLink).mockResolvedValue(null);
	jest.mocked(getAutoRoles).mockResolvedValue(null);
	jest.mocked(getCounting).mockResolvedValue(null);
	jest.mocked(getVoiceCounter).mockResolvedValue(null);
});

describe("reading the settings", () => {
	/** A guild that has configured nothing still has to render a form, so every section has a default. */
	it("gives an untouched guild defaults rather than nulls", async () => {
		const config = await read();

		expect(config.prefix).toEqual({ prefix: "t?", enabled: true });
		expect(config.antiLink.enabled).toBe(false);
		expect(config.autoRoles.roleIds).toEqual([]);
		expect(config.counting.enabled).toBe(false);
		expect(config.voiceStats).toEqual({ memberChannelId: null, botChannelId: null });
	});

	it("reports what is configured", async () => {
		jest.mocked(getAntiLink).mockResolvedValue({ guildId: GUILD, bypassPermission: "ManageGuild" } as never);
		jest.mocked(getAutoRoles).mockResolvedValue({ guildId: GUILD, roleIds: [ROLE] } as never);
		jest
			.mocked(getCounting)
			.mockResolvedValue({ guildId: GUILD, channelId: CHANNEL, count: 41, maxCount: 100 } as never);

		const config = await read();

		expect(config.antiLink).toEqual({ enabled: true, bypassPermission: "ManageGuild" });
		expect(config.autoRoles.roleIds).toEqual([ROLE]);
		expect(config.counting).toEqual({ enabled: true, channelId: CHANNEL, maxCount: 100, count: 41 });
	});

	/** A flag name stored before the list settled would render as a `<select>` value with no option. */
	it("normalises a bypass permission the form has no option for", async () => {
		jest.mocked(getAntiLink).mockResolvedValue({ guildId: GUILD, bypassPermission: "KickMembers" } as never);

		expect((await read()).antiLink.bypassPermission).toBe("ManageMessages");
	});
});

describe("the prefix", () => {
	it("saves a new one", async () => {
		await send("PATCH", "/prefix", { prefix: "!" });

		expect(setPrefix).toHaveBeenCalledWith(GUILD, "!");
	});

	it("turns the whole prefix surface off without touching the prefix itself", async () => {
		await send("PATCH", "/prefix", { enabled: false });

		expect(setPrefixEnabled).toHaveBeenCalledWith(GUILD, false);
		expect(setPrefix).not.toHaveBeenCalled();
	});

	/** A prefix with a space in it can never be typed; one of pure whitespace matches every message. */
	it("refuses a prefix nobody could use", async () => {
		for (const prefix of ["", "   ", "a b", "waytoolongprefix"]) {
			expect((await send("PATCH", "/prefix", { prefix })).status).toBe(400);
		}

		expect(setPrefix).not.toHaveBeenCalled();
	});

	it("trims the surrounding space rather than refusing it", async () => {
		await send("PATCH", "/prefix", { prefix: " ! " });

		expect(setPrefix).toHaveBeenCalledWith(GUILD, "!");
	});

	it("rejects a body that changes nothing", async () => {
		expect((await send("PATCH", "/prefix", {})).status).toBe(400);
	});
});

describe("link filtering", () => {
	it("deletes the record when it is turned off", async () => {
		await send("PATCH", "/anti-link", { enabled: false });

		expect(disableAntiLink).toHaveBeenCalledWith(GUILD);
		expect(setAntiLink).not.toHaveBeenCalled();
	});

	/** Turning it on with no permission chosen has to land on the default rather than an empty string. */
	it("turns on with the default bypass when none is given", async () => {
		await send("PATCH", "/anti-link", { enabled: true });

		expect(setAntiLink).toHaveBeenCalledWith(GUILD, "ManageMessages");
	});

	it("keeps the stored bypass when only the switch changes", async () => {
		jest.mocked(getAntiLink).mockResolvedValue({ guildId: GUILD, bypassPermission: "Administrator" } as never);

		await send("PATCH", "/anti-link", { enabled: true });

		expect(setAntiLink).toHaveBeenCalledWith(GUILD, "Administrator");
	});

	it("rejects a permission that is not one of the four", async () => {
		expect((await send("PATCH", "/anti-link", { bypassPermission: "BanMembers" })).status).toBe(400);
	});
});

describe("roles on join", () => {
	/** The control is a checklist whose value is the list, so one request replaces the whole thing. */
	it("replaces the list rather than adding to it", async () => {
		await send("PUT", "/auto-roles", { roleIds: [ROLE] });

		expect(setAutoRoles).toHaveBeenCalledWith(GUILD, [ROLE]);
	});

	it("accepts an empty list, which is how the last role is removed", async () => {
		await send("PUT", "/auto-roles", { roleIds: [] });

		expect(setAutoRoles).toHaveBeenCalledWith(GUILD, []);
	});

	it("rejects more roles than the bot will hand out", async () => {
		const tooMany = Array.from({ length: 11 }, (_, index) => `30000000000000000${String(index)}`);

		expect((await send("PUT", "/auto-roles", { roleIds: tooMany })).status).toBe(400);
	});

	it("rejects an id that is not a snowflake", async () => {
		expect((await send("PUT", "/auto-roles", { roleIds: ["../../etc/passwd"] })).status).toBe(400);
	});
});

describe("counting", () => {
	it("saves the channel and the target", async () => {
		await send("PATCH", "/counting", { channelId: CHANNEL, maxCount: 500 });

		expect(setCounting).toHaveBeenCalledWith(GUILD, CHANNEL, 500);
	});

	it("deletes the record when it is turned off", async () => {
		await send("PATCH", "/counting", { enabled: false });

		expect(disableCounting).toHaveBeenCalledWith(GUILD);
		expect(setCounting).not.toHaveBeenCalled();
	});

	/** The stored record requires a channel, and counting with nowhere to count is not a configuration. */
	it("refuses to turn counting on before a channel is chosen", async () => {
		expect((await send("PATCH", "/counting", { enabled: true })).status).toBe(400);
		expect(setCounting).not.toHaveBeenCalled();
	});

	it("resets the count without changing anything else", async () => {
		jest
			.mocked(getCounting)
			.mockResolvedValue({ guildId: GUILD, channelId: CHANNEL, count: 41, maxCount: 100 } as never);

		await send("PATCH", "/counting", { reset: true });

		expect(resetCount).toHaveBeenCalledWith(GUILD);
	});

	it("rejects a target that is not a whole number in range", async () => {
		for (const maxCount of [0, -1, 1.5, 2_000_000]) {
			expect((await send("PATCH", "/counting", { maxCount })).status).toBe(400);
		}
	});
});

describe("the voice stat channels", () => {
	it("sets only the field that was sent", async () => {
		await send("PATCH", "/voice-stats", { memberChannelId: CHANNEL });

		expect(setVoiceCounter).toHaveBeenCalledWith(GUILD, { memberChannelId: CHANNEL });
	});

	/** Null is a real value here — it is how a channel stops being renamed. */
	it("accepts null to stop showing one", async () => {
		await send("PATCH", "/voice-stats", { botChannelId: null });

		expect(setVoiceCounter).toHaveBeenCalledWith(GUILD, { botChannelId: null });
	});
});

describe("every write", () => {
	/**
	 * One response keeps the screen consistent: a section that refuses cannot leave the rest of the page
	 * showing a value the bot does not have.
	 */
	it("answers with the whole settings document", async () => {
		const body = (await (await send("PATCH", "/prefix", { prefix: "!" })).json()) as ServerSettings;

		expect(Object.keys(body).toSorted()).toEqual(["antiLink", "autoRoles", "counting", "prefix", "voiceStats"]);
	});

	it("writes an audit record naming what changed", async () => {
		await send("PATCH", "/prefix", { enabled: false });

		expect(recordAudit).toHaveBeenCalledWith(
			expect.objectContaining({ action: "settings.prefix", summary: "Turned prefix commands off" }),
		);
	});
});
