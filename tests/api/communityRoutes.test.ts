import { Collection, type Guild, PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { starboard } from "@api/routes/starboard";
import { tempVoice } from "@api/routes/tempVoice";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { applyStarboardSettings, readStarboardSettings } from "@lib/starboard";
import { applyTempVoiceSettings, makeLobby, readTempVoiceSettings } from "@lib/tempVoice";

jest.mock("@lib/starboard", () => ({
	applyStarboardSettings: jest.fn(() => Promise.resolve({ enabled: true })),
	readStarboardSettings: jest.fn(() => Promise.resolve({ enabled: false })),
}));
jest.mock("@lib/tempVoice", () => ({
	applyTempVoiceSettings: jest.fn(() => Promise.resolve({ enabled: true })),
	makeLobby: jest.fn(() => Promise.resolve({ lobbyChannelId: "400000000000000001" })),
	readTempVoiceSettings: jest.fn(() => Promise.resolve({ enabled: false })),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const ACTOR = "100000000000000002";

/** A manager who has Manage Server and nothing else, unless told otherwise. */
function app(granted: bigint[] = [PermissionFlagsBits.ManageGuild]): Hono<ApiBindings> {
	const actor = {
		id: ACTOR,
		permissions: { has: (flags: bigint | bigint[]) => [flags].flat().every((flag) => granted.includes(flag)) },
	};
	const guild = {
		id: GUILD,
		name: "Test Server",
		members: { fetch: jest.fn(() => Promise.resolve(actor)) },
	} as unknown as Guild;
	const client = {
		guilds: { cache: new Collection<string, unknown>([[GUILD, guild]]) },
		isOwner: () => false,
		logger: { error: jest.fn() },
	} as unknown as TestifyClient;

	const instance = new Hono<ApiBindings>();
	instance.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", {} as Env);
		context.set("oauth", null);
		context.set("session", { _id: "s", userId: ACTOR, username: "someone" } as never);
		await next();
	});
	instance.route("/guilds/:guildId/starboard", starboard);
	instance.route("/guilds/:guildId/temp-voice", tempVoice);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});
	return instance;
}

const send = (instance: Hono<ApiBindings>, method: string, path: string, body?: unknown): Promise<Response> =>
	Promise.resolve(
		instance.request(`/guilds/${GUILD}${path}`, {
			method,
			headers: { "content-type": "application/json" },
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
		}),
	);

beforeEach(() => {
	jest.clearAllMocks();
});

describe("the starboard route", () => {
	it("reads and writes through the same functions the Discord panel uses, and writes it down", async () => {
		expect((await send(app(), "GET", "/starboard")).status).toBe(200);
		expect(readStarboardSettings).toHaveBeenCalled();

		const response = await send(app(), "PATCH", "/starboard", { threshold: 5 });
		expect(response.status).toBe(200);
		expect(applyStarboardSettings).toHaveBeenCalledWith(
			expect.objectContaining({ id: GUILD }),
			{ threshold: 5 },
			ACTOR,
		);
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "starboard.update" }));
	});

	it("refuses a threshold out of range before anything is written", async () => {
		expect((await send(app(), "PATCH", "/starboard", { threshold: 0 })).status).toBe(400);
		expect(applyStarboardSettings).not.toHaveBeenCalled();
	});
});

describe("the join-to-create route", () => {
	it("reads and saves settings with Manage Server alone", async () => {
		expect((await send(app(), "GET", "/temp-voice")).status).toBe(200);
		expect(readTempVoiceSettings).toHaveBeenCalledWith(expect.objectContaining({ id: GUILD }));

		const response = await send(app(), "PATCH", "/temp-voice", { userLimit: 4 });

		expect(response.status).toBe(200);
		expect(applyTempVoiceSettings).toHaveBeenCalledWith(expect.anything(), { userLimit: 4 }, ACTOR);
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "temp-voice.update" }));
	});

	/** Making a channel is what Discord asks Manage Channels for, so the web cannot do it for somebody without it. */
	it("asks for Manage Channels before making a lobby", async () => {
		const refused = await send(app(), "POST", "/temp-voice/lobby");
		expect(refused.status).toBe(403);
		expect(makeLobby).not.toHaveBeenCalled();

		const allowed = await send(
			app([PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels]),
			"POST",
			"/temp-voice/lobby",
		);
		expect(allowed.status).toBe(200);
		expect(makeLobby).toHaveBeenCalledWith(expect.objectContaining({ id: GUILD }), ACTOR);
	});

	it("refuses a user limit Discord would refuse", async () => {
		expect((await send(app(), "PATCH", "/temp-voice", { userLimit: 100 })).status).toBe(400);
		expect(applyTempVoiceSettings).not.toHaveBeenCalled();
	});
});
