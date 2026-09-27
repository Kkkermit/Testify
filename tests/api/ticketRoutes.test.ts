import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { tickets } from "@api/routes/tickets";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import {
	countOpenTickets,
	deleteTicketSetup,
	getTicketSetup,
	saveTicketSetup,
} from "@database/repositories/ticketRepository";
import { type TicketSettings } from "@testify/shared";

jest.mock("@database/repositories/ticketRepository", () => ({
	countOpenTickets: jest.fn(() => Promise.resolve(0)),
	deleteTicketSetup: jest.fn(() => Promise.resolve(true)),
	getTicketSetup: jest.fn(() => Promise.resolve(null)),
	saveTicketSetup: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const PANEL = "400000000000000001";

const stored = jest.mocked(getTicketSetup);
const saved = jest.mocked(saveTicketSetup);
const removed = jest.mocked(deleteTicketSetup);
const audited = jest.mocked(recordAudit);

const send = jest.fn();

const COMPLETE = {
	panelChannelId: PANEL,
	categoryId: "400000000000000005",
	transcriptChannelId: "400000000000000002",
	staffRoleId: "300000000000000003",
};

function configured(overrides: Record<string, unknown> = {}): void {
	stored.mockResolvedValue({
		guildId: GUILD,
		channelId: PANEL,
		categoryId: "400000000000000005",
		transcriptChannelId: "400000000000000002",
		handlerRoleId: "300000000000000003",
		everyoneRoleId: GUILD,
		description: "Press the button",
		buttonLabel: "Create ticket",
		buttonEmoji: "🎫",
		messageId: "500000000000000001",
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	});
}

function app(): Hono<ApiBindings> {
	const guild = {
		id: GUILD,
		name: "Test Server",
		members: { me: {} },
		roles: { everyone: { id: GUILD } },
		channels: { fetch: jest.fn().mockResolvedValue({ isSendable: () => true, send }) },
	};
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
	instance.route("/guilds/:guildId/tickets", tickets);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function request(method: string, body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/tickets`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	stored.mockResolvedValue(null);
	jest.mocked(countOpenTickets).mockResolvedValue(0);
	removed.mockResolvedValue(true);
	send.mockResolvedValue({ id: "500000000000000009" });
});

describe("GET /tickets", () => {
	/** No record at all is how the bot stores "off", and a 404 would make the form unbuildable. */
	it("answers with something a form can render when nothing is configured", async () => {
		const body = (await (await request("GET")).json()) as TicketSettings;

		expect(body).toMatchObject({ enabled: false, panelChannelId: null, posted: false });
	});

	it("reports what is stored, and how many tickets are open", async () => {
		configured();
		jest.mocked(countOpenTickets).mockResolvedValue(6);

		const body = (await (await request("GET")).json()) as TicketSettings;

		expect(body).toMatchObject({ enabled: true, panelChannelId: PANEL, posted: true, openTickets: 6 });
	});
});

describe("PATCH /tickets", () => {
	it("refuses a half-configured setup rather than storing one", async () => {
		const response = await request("PATCH", { panelChannelId: PANEL });

		expect(response.status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it("stores a complete one", async () => {
		const response = await request("PATCH", COMPLETE);

		expect(response.status).toBe(200);
		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ channelId: PANEL }));
	});

	/** The message is public, so choosing a channel must not drop a panel into it. */
	it("does not post the panel just because a channel was chosen", async () => {
		await request("PATCH", COMPLETE);

		expect(send).not.toHaveBeenCalled();
	});

	it("posts when asked", async () => {
		const response = await request("PATCH", { ...COMPLETE, publish: true });

		expect(response.status).toBe(200);
		expect(send).toHaveBeenCalled();
		expect(((await response.json()) as TicketSettings).posted).toBe(true);
	});

	it("refuses an id that is not a snowflake", async () => {
		const response = await request("PATCH", { ...COMPLETE, categoryId: "nope" });

		expect(response.status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it("refuses HTML in the panel message", async () => {
		const response = await request("PATCH", { ...COMPLETE, description: "<script>x</script>" });

		expect(response.status).toBe(400);
		expect(saved).not.toHaveBeenCalled();
	});

	it("tells a publish from an ordinary edit in the audit record", async () => {
		await request("PATCH", COMPLETE);
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "tickets.update" }));

		jest.clearAllMocks();
		send.mockResolvedValue({ id: "500000000000000009" });

		await request("PATCH", { ...COMPLETE, publish: true });
		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "tickets.publish" }));
	});

	it("strips invisible characters from the wording before storing it", async () => {
		await request("PATCH", { ...COMPLETE, description: " Press ‮here " });

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ description: "Press here" }));
	});
});

describe("DELETE /tickets", () => {
	it("turns the system off and answers with the empty shape", async () => {
		configured();

		const response = await request("DELETE");

		expect(response.status).toBe(200);
		expect(removed).toHaveBeenCalledWith(GUILD);
		expect(((await response.json()) as TicketSettings).enabled).toBe(false);
	});

	/** Two tabs, both pressing Turn off: the second finds nothing, which is a 404 rather than a 500. */
	it("answers 404 when there was nothing to turn off", async () => {
		removed.mockResolvedValue(false);

		expect((await request("DELETE")).status).toBe(404);
		expect(audited).not.toHaveBeenCalled();
	});

	it("writes an audit record", async () => {
		await request("DELETE");

		expect(audited).toHaveBeenCalledWith(expect.objectContaining({ action: "tickets.disable" }));
	});
});
