import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { welcome } from "@api/routes/welcome";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { disableWelcome, getWelcome, saveWelcome } from "@database/repositories/settingsRepository";
import { DEFAULT_WELCOME_MESSAGE, type WelcomeConfigResponse } from "@testify/shared";

jest.mock("@database/repositories/settingsRepository", () => ({
	disableWelcome: jest.fn(() => Promise.resolve(true)),
	getWelcome: jest.fn(() => Promise.resolve(null)),
	saveWelcome: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const CHANNEL = "400000000000000001";

const stored = jest.mocked(getWelcome);
const saved = jest.mocked(saveWelcome);
const disabled = jest.mocked(disableWelcome);
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
	instance.route("/guilds/:guildId/welcome", welcome);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(method: string, body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/welcome`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

async function bodyOf(response: Response): Promise<WelcomeConfigResponse> {
	return (await response.json()) as WelcomeConfigResponse;
}

function configured(overrides: Record<string, unknown> = {}): void {
	stored.mockResolvedValue({
		guildId: GUILD,
		channelId: CHANNEL,
		message: "Hello {user}",
		style: "card",
		isEmbed: false,
		...overrides,
	} as never);
}

beforeEach(() => {
	jest.clearAllMocks();
	stored.mockResolvedValue(null);
});

describe("reading the configuration", () => {
	/** The bot stores "off" as no record at all, so a form still needs something to render. */
	it("gives an unconfigured guild the defaults rather than a 404", async () => {
		const config = await bodyOf(await send("GET"));

		expect(config.enabled).toBe(false);
		expect(config.channelId).toBeNull();
		expect(config.message).toBe(DEFAULT_WELCOME_MESSAGE);
	});

	it("reports a configured guild as enabled", async () => {
		configured();

		const config = await bodyOf(await send("GET"));

		expect(config).toMatchObject({ enabled: true, channelId: CHANNEL, message: "Hello {user}", style: "card" });
	});

	/** `normaliseWelcome` migrates the old boolean, so the web shows what the Discord panel shows. */
	it("migrates the old isEmbed flag into a style", async () => {
		configured({ style: undefined, isEmbed: true });

		expect((await bodyOf(await send("GET"))).style).toBe("embed");
	});

	/** The image is a Buffer in the database; sending it would be megabytes on every page load. */
	it("reports whether there is a background without sending it", async () => {
		configured({ background: { data: Buffer.from("x".repeat(64)), contentType: "image/png", name: "bg.png" } });

		const config = await bodyOf(await send("GET"));

		expect(config.hasBackground).toBe(true);
		expect(Object.keys(config)).not.toContain("background");
	});
});

describe("changing the configuration", () => {
	it("saves a new message, keeping the channel and style it already had", async () => {
		configured();

		await send("PATCH", { message: "Hi {username}" });

		expect(saved).toHaveBeenCalledWith(GUILD, { channelId: CHANNEL, message: "Hi {username}", style: "card" });
	});

	it("deletes the record when the greeting is turned off", async () => {
		configured();

		await send("PATCH", { enabled: false });

		expect(disabled).toHaveBeenCalledWith(GUILD);
		expect(saved).not.toHaveBeenCalled();
	});

	/** The stored record requires a channel, and a greeting with nowhere to go is not a configuration. */
	it("refuses to turn the greeting on before a channel is chosen", async () => {
		const response = await send("PATCH", { enabled: true });

		expect(response.status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it("turns it on when the same request supplies the channel", async () => {
		await send("PATCH", { enabled: true, channelId: CHANNEL });

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ channelId: CHANNEL }));
	});

	it("rejects a message longer than Discord accepts", async () => {
		configured();

		expect((await send("PATCH", { message: "x".repeat(1_501) })).status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it("rejects an empty message rather than storing one", async () => {
		configured();

		expect((await send("PATCH", { message: "   " })).status).toBe(400);
	});

	it("rejects a style the bot cannot render", async () => {
		configured();

		expect((await send("PATCH", { style: "hologram" })).status).toBe(400);
	});

	it("rejects a channel id that is not a snowflake", async () => {
		expect((await send("PATCH", { channelId: "../../etc/passwd" })).status).toBe(400);
	});

	/** Every mutation is recorded, and the summary is what the overview's recent-changes card reads. */
	it("writes an audit record saying what changed", async () => {
		configured();

		await send("PATCH", { enabled: false });

		expect(audited).toHaveBeenCalledWith(
			expect.objectContaining({ action: "welcome.update", summary: "Turned welcomes off" }),
		);
	});
});
