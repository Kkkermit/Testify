import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, badRequest, problemBody } from "@api/errors";
import { scheduledMessages } from "@api/routes/scheduledMessages";
import { HOUR_MS } from "@config/constants";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { type ScheduleFields, type StoredSchedule } from "@database/repositories/scheduledMessageRepository";
import { type ScheduledMessageList } from "@testify/shared";

/** A stand-in for the collection, so the route runs through the real actions. */
const stored = new Map<string, StoredSchedule>();
let nextId = 0;

jest.mock("@database/repositories/scheduledMessageRepository", () => ({
	listSchedules: jest.fn((guildId: string) =>
		Promise.resolve([...stored.values()].filter((row) => row.guildId === guildId)),
	),
	countSchedules: jest.fn(() => Promise.resolve(stored.size)),
	findSchedule: jest.fn((guildId: string, id: string) =>
		Promise.resolve(stored.get(id)?.guildId === guildId ? (stored.get(id) ?? null) : null),
	),
	createSchedule: jest.fn((guildId: string, fields: ScheduleFields) => {
		nextId += 1;
		const row = { id: nextId.toString(16).padStart(24, "0"), guildId, ...fields };
		stored.set(row.id, row);
		return Promise.resolve(row);
	}),
	updateSchedule: jest.fn((_guildId: string, id: string, fields: Partial<ScheduleFields>) => {
		const row = { ...stored.get(id)!, ...fields };
		stored.set(id, row);
		return Promise.resolve(row);
	}),
	deleteSchedule: jest.fn((_guildId: string, id: string) => Promise.resolve(stored.delete(id))),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/discord/channels.util", () => ({ canPostIn: jest.fn(() => true) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const CHANNEL = "400000000000000001";
const MISSING = "f".repeat(24);

function app(): Hono<ApiBindings> {
	const guild = { id: GUILD, name: "Test Server", memberCount: 3 };
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
	instance.route("/guilds/:guildId/scheduled-messages", scheduledMessages);
	instance.onError((error) => {
		// The same mapping the real app's boundary makes in `server.ts`.
		const problem =
			error instanceof ApiProblem
				? error
				: error instanceof UserFacingError
					? badRequest(error.message)
					: new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});
	return instance;
}

async function send(method: string, path = "", body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/scheduled-messages${path}`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

const inAnHour = (): string => new Date(Date.now() + HOUR_MS).toISOString();
const news = () => ({ channelId: CHANNEL, message: "Event tonight", repeat: "weekly", nextAt: inAnHour() });

beforeEach(() => {
	stored.clear();
	jest.clearAllMocks();
});

describe("the scheduled message routes", () => {
	it("adds one, answers with the whole list in UTC, and writes it down", async () => {
		const body = news();
		const response = await send("POST", "", body);

		expect(response.status).toBe(201);
		const list = (await response.json()) as ScheduledMessageList;
		expect(list.messages).toEqual([expect.objectContaining({ ...body, canSend: true })]);
		expect(list.limit).toBe(10);
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "schedule.create" }));
	});

	it("refuses a time already gone, in words, and a body the schema does not accept", async () => {
		const past = await send("POST", "", { ...news(), nextAt: new Date(Date.now() - HOUR_MS).toISOString() });
		expect(past.status).toBe(400);
		expect(JSON.stringify(await past.json())).toContain("already gone");

		expect((await send("POST", "", { ...news(), repeat: "hourly" })).status).toBe(400);
		expect((await send("POST", "", { ...news(), nextAt: "tomorrow" })).status).toBe(400);
		expect(recordAudit).not.toHaveBeenCalled();
	});

	it("edits one and deletes it", async () => {
		const id = ((await (await send("POST", "", news())).json()) as ScheduledMessageList).messages[0]?.id ?? "";

		const edited = (await (
			await send("PUT", `/${id}`, { ...news(), message: "Moved to Friday" })
		).json()) as ScheduledMessageList;
		expect(edited.messages[0]?.message).toBe("Moved to Friday");

		const removed = (await (await send("DELETE", `/${id}`)).json()) as ScheduledMessageList;
		expect(removed.messages).toEqual([]);
	});

	it("answers 404 for one that is not there, and 400 for an id that is not one", async () => {
		expect((await send("PUT", `/${MISSING}`, news())).status).toBe(404);
		expect((await send("DELETE", `/${MISSING}`)).status).toBe(404);
		expect((await send("DELETE", "/not-an-id")).status).toBe(400);
	});
});
