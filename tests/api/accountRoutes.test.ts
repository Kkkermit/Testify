import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { account } from "@api/routes/account";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { auditServersOf, auditsBy } from "@database/repositories/dashboardAuditRepository";
import { endOtherSessions, endSessionByHandle, sessionsFor } from "@database/repositories/dashboardSessionRepository";
import {
	cancelReminder,
	findReminder,
	listReminders,
	setReminderDelivery,
	type StoredReminder,
} from "@database/repositories/reminderRepository";
import { type AccountHistory, type AccountReminder, type AccountSession } from "@testify/shared";

jest.mock("@database/repositories/dashboardAuditRepository", () => ({
	auditsBy: jest.fn(),
	auditServersOf: jest.fn(),
}));
jest.mock("@database/repositories/dashboardSessionRepository", () => ({
	endOtherSessions: jest.fn(),
	endSessionByHandle: jest.fn(),
	sessionsFor: jest.fn(),
}));
jest.mock("@database/repositories/reminderRepository", () => ({
	cancelReminder: jest.fn(),
	findReminder: jest.fn(),
	listReminders: jest.fn(),
	setReminderDelivery: jest.fn(),
}));

const USER = "100000000000000001";
const COOKIE = "the-session-cookie";
const HERE = "900000000000000001";
const GONE = "900000000000000002";
const REMINDER_ID = "a".repeat(24);

function reminder(overrides: Partial<StoredReminder> = {}): StoredReminder {
	return {
		id: REMINDER_ID,
		userId: USER,
		guildId: HERE,
		channelId: "800000000000000001",
		text: "Feed the cat",
		dueAt: new Date("2026-11-06T09:00:00.000Z"),
		deliver: "channel",
		createdAt: new Date("2026-11-05T09:00:00.000Z"),
		...overrides,
	};
}

function app(): Hono<ApiBindings> {
	const instance = new Hono<ApiBindings>();
	instance.use("*", async (context, next) => {
		const guilds = new Map([[HERE, { id: HERE, name: "Test Server" }]]);
		context.set("client", { guilds: { cache: guilds } } as unknown as TestifyClient);
		context.set("env", {} as Env);
		context.set("oauth", null);
		context.set("session", { _id: COOKIE, userId: USER, username: "someone" } as never);
		await next();
	});
	instance.route("/account", account);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});
	return instance;
}

async function send(method: string, path: string, body?: unknown): Promise<Response> {
	return await app().request(path, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

describe("the account routes", () => {
	/** Whose history is read comes from the session, so no query can ask for somebody else's. */
	it("reads the signed-in person's own history, naming each server and leaving a left one unnamed", async () => {
		jest.mocked(auditsBy).mockResolvedValue({
			items: [
				{
					_id: { toString: () => "b".repeat(24) },
					actorId: USER,
					actorTag: "someone",
					guildId: GONE,
					action: "levelling.update",
					summary: "Turned levelling on",
					source: "command",
					at: new Date("2026-11-05T10:00:00.000Z"),
				},
			] as never,
			total: 1,
		});
		jest.mocked(auditServersOf).mockResolvedValue([GONE, null, HERE]);

		const response = await send("GET", `/account/history?server=${GONE}&actorId=100000000000000002`);
		const body = (await response.json()) as AccountHistory;

		expect(auditsBy).toHaveBeenCalledWith(USER, 1, 25, GONE);
		expect(body.items[0]).toMatchObject({ guildId: GONE, guildName: null, source: "command" });
		expect(body.servers).toEqual([
			{ id: HERE, name: "Test Server" },
			{ id: GONE, name: null },
		]);
		expect((await send("GET", "/account/history?server=nope")).status).toBe(400);
	});

	it("lists reminders without naming the channel they ping in", async () => {
		jest
			.mocked(listReminders)
			.mockResolvedValue([reminder(), reminder({ guildId: null, channelId: null, deliver: "dm" })]);

		const body = (await (await send("GET", "/account/reminders")).json()) as AccountReminder[];

		expect(listReminders).toHaveBeenCalledWith(USER);
		expect(body.map((row) => [row.guildName, row.canPing])).toEqual([
			["Test Server", true],
			[null, false],
		]);
		expect(JSON.stringify(body)).not.toContain("800000000000000001");
	});

	/** A reminder set in a DM has no channel to ping, so switching it to one is refused rather than stored. */
	it("refuses to send a direct-message reminder to a channel, and a reminder that is not theirs is gone", async () => {
		jest.mocked(findReminder).mockResolvedValueOnce(reminder({ guildId: null, channelId: null, deliver: "dm" }));
		expect((await send("PUT", `/account/reminders/${REMINDER_ID}/deliver`, { deliver: "channel" })).status).toBe(400);
		expect(setReminderDelivery).not.toHaveBeenCalled();

		jest.mocked(findReminder).mockResolvedValueOnce(null);
		const missing = await send("PUT", `/account/reminders/${REMINDER_ID}/deliver`, { deliver: "dm" });
		expect(missing.status).toBe(404);
		expect(findReminder).toHaveBeenLastCalledWith(USER, REMINDER_ID);
	});

	it("switches a reminder to a direct message and cancels one through the owner's own lookup", async () => {
		jest.mocked(findReminder).mockResolvedValue(reminder());
		jest.mocked(setReminderDelivery).mockResolvedValue(reminder({ deliver: "dm" }));
		const changed = await send("PUT", `/account/reminders/${REMINDER_ID}/deliver`, { deliver: "dm" });
		expect(((await changed.json()) as AccountReminder).deliver).toBe("dm");

		jest.mocked(cancelReminder).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
		expect((await send("DELETE", `/account/reminders/${REMINDER_ID}`)).status).toBe(204);
		expect((await send("DELETE", `/account/reminders/${REMINDER_ID}`)).status).toBe(404);
		expect(cancelReminder).toHaveBeenCalledWith(USER, REMINDER_ID);
	});

	/** The browser is told each sign-in's handle and times, and never a cookie. */
	it("lists sign-ins by handle and ends one, or every other, for the session asking", async () => {
		const when = new Date("2026-11-05T10:00:00.000Z");
		jest
			.mocked(sessionsFor)
			.mockResolvedValue([
				{ handle: "c".repeat(24), createdAt: when, lastSeenAt: when, expiresAt: when, current: true },
			]);

		const listed = (await (await send("GET", "/account/sessions")).json()) as AccountSession[];
		expect(sessionsFor).toHaveBeenCalledWith(USER, COOKIE);
		expect(JSON.stringify(listed)).not.toContain(COOKIE);

		jest.mocked(endSessionByHandle).mockResolvedValueOnce(false);
		expect((await send("DELETE", `/account/sessions/${"d".repeat(24)}`)).status).toBe(404);
		expect(endSessionByHandle).toHaveBeenCalledWith(USER, "d".repeat(24), COOKIE);
		expect((await send("DELETE", "/account/sessions/not-a-handle")).status).toBe(400);

		jest.mocked(endOtherSessions).mockResolvedValue(2);
		expect(await (await send("POST", "/account/sessions/others/end")).json()).toEqual({ ended: 2 });
		expect(endOtherSessions).toHaveBeenCalledWith(USER, COOKIE);
	});
});
