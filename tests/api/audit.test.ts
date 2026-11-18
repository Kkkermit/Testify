import { Hono } from "hono";
import { answerLikeTheApp, withSession } from "../helpers/apiHarness";
import { auditChange, auditSettings, changedScreen } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { type TestifyClient } from "@core/client";
import { CHANGE_WAY_HEADER } from "@testify/shared";

jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";

function appWith(track: jest.Mock): Hono<ApiBindings> {
	const client = { shardlens: { track }, logger: { error: jest.fn() } } as unknown as TestifyClient;
	const app = new Hono<ApiBindings>();
	withSession(app, client, { userId: OWNER, username: "someone" });
	app.use("/api/guilds/:guildId/*", async (context, next) => {
		context.set("guild", { id: GUILD } as never);
		await next();
	});
	app.put("/api/guilds/:guildId/welcome", async (context) => {
		await auditSettings(context, { action: "welcome.update", summary: "Changed it", before: {}, after: {} });
		return context.body(null, 204);
	});
	app.put("/api/guilds/:guildId/goodbye", async (context) => {
		await auditSettings(context, { action: "goodbye.update", summary: "Changed it", before: {}, after: {} });
		return context.body(null, 204);
	});
	app.post("/api/guilds/:guildId/setup/welcome", async (context) => {
		await auditChange(context, { action: "setup.welcome", summary: "Set it up" });
		return context.body(null, 204);
	});
	app.post("/api/guilds/:guildId/test-post", async (context) => {
		await auditChange(context, { action: "test.send", summary: "Sent a test" });
		return context.body(null, 204);
	});
	answerLikeTheApp(app);
	return app;
}

async function write(app: Hono<ApiBindings>, method: string, path: string, via?: string): Promise<void> {
	await app.request(`/api/guilds/${GUILD}${path}`, {
		method,
		headers: via === undefined ? {} : { [CHANGE_WAY_HEADER]: via },
	});
}

describe("changedScreen", () => {
	it("names the screen a write came from by its route pattern, never the server", () => {
		expect(changedScreen(`/api/guilds/${GUILD}/welcome`)).toBe("/guilds/:guildId/welcome");
		expect(changedScreen(`/api/guilds/${GUILD}/settings/nickname`)).toBe("/guilds/:guildId/settings");
		expect(changedScreen(`/api/guilds/${GUILD}/goodbye`)).toBe("/guilds/:guildId/welcome");
		expect(changedScreen(`/api/guilds/${GUILD}/setup/welcome`)).toBe("/guilds/:guildId");
		expect(changedScreen(`/api/guilds/${GUILD}/no-such-screen`)).toBeNull();
		expect(changedScreen("/api/control/identity")).toBeNull();
	});
});

describe("a dashboard change", () => {
	/** Screen views say who visited; this says what changed, and how, without saying who changed it. */
	it("is counted by its screen and the way it was made, with the server as context and nobody named", async () => {
		const track = jest.fn();
		const app = appWith(track);

		await write(app, "PUT", "/welcome");
		await write(app, "PUT", "/goodbye", "put_back");
		await write(app, "PUT", "/welcome", "backup");
		await write(app, "POST", "/setup/welcome");

		expect(track.mock.calls).toEqual([
			["dashboard_change", { screen: "/guilds/:guildId/welcome", how: "save" }, { guildId: GUILD }],
			["dashboard_change", { screen: "/guilds/:guildId/welcome", how: "put_back" }, { guildId: GUILD }],
			["dashboard_change", { screen: "/guilds/:guildId/welcome", how: "backup" }, { guildId: GUILD }],
			["dashboard_change", { screen: "/guilds/:guildId", how: "setup" }, { guildId: GUILD }],
		]);
		expect(JSON.stringify(track.mock.calls)).not.toContain(OWNER);
	});

	/** The header is the page's word for how a change was made, so anything else it says is an ordinary save. */
	it("reads a header it does not know as a save, and counts a test post as no change at all", async () => {
		const track = jest.fn();
		const app = appWith(track);

		await write(app, "PUT", "/welcome", "<script>");
		await write(app, "POST", "/test-post");

		expect(track.mock.calls).toEqual([
			["dashboard_change", { screen: "/guilds/:guildId/welcome", how: "save" }, { guildId: GUILD }],
		]);
	});
});
