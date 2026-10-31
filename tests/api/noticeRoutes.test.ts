import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, badRequest, problemBody } from "@api/errors";
import { notices } from "@api/routes/notices";
import { ownerNotices } from "@api/routes/ownerNotices";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import {
	createNotice,
	deleteNotice,
	findNotice,
	listNotices,
	markNoticesSeen,
	readerState,
	updateNotice,
} from "@database/repositories/noticeRepository";
import { type Notice, type NoticeFeed } from "@testify/shared";

jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@database/repositories/noticeRepository", () => ({
	createNotice: jest.fn(),
	deleteNotice: jest.fn(),
	findNotice: jest.fn(),
	listNotices: jest.fn(),
	markNoticeHinted: jest.fn(),
	markNoticesSeen: jest.fn(),
	readerState: jest.fn(),
	updateNotice: jest.fn(),
}));

const OWNER = "100000000000000001";
const MEMBER = "100000000000000002";
const MUSIC: Notice = {
	id: "a".repeat(24),
	title: "Music is down",
	body: "YouTube is refusing the bot.",
	tone: "problem",
	publishedAt: "2026-10-31T10:00:00.000Z",
	endsAt: null,
	updatedAt: "2026-10-31T10:00:00.000Z",
};

function app(userId: string | null): Hono<ApiBindings> {
	const instance = new Hono<ApiBindings>();
	instance.use("*", async (context, next) => {
		context.set("client", { isOwner: (id: string) => id === OWNER } as unknown as TestifyClient);
		context.set("env", {} as Env);
		context.set("oauth", null);
		if (userId !== null) context.set("session", { _id: "s", userId, username: "someone" } as never);
		await next();
	});
	instance.route("/notices", notices);
	instance.route("/owner/notices", ownerNotices);
	// The same mapping the real app's boundary makes in `server.ts`.
	instance.onError((error) => {
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

async function send(userId: string | null, method: string, path: string, body?: unknown): Promise<Response> {
	return await app(userId).request(path, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	jest.mocked(listNotices).mockResolvedValue([MUSIC]);
	jest.mocked(readerState).mockResolvedValue({ seenAt: null, hintedAt: null });
	jest.mocked(markNoticesSeen).mockResolvedValue();
	jest.mocked(findNotice).mockResolvedValue(MUSIC);
	jest
		.mocked(createNotice)
		.mockImplementation((input) => Promise.resolve({ ...MUSIC, ...input, endsAt: input.endsAt ?? null }));
	jest.mocked(updateNotice).mockResolvedValue(MUSIC);
	jest.mocked(deleteNotice).mockResolvedValue(true);
	jest.mocked(recordAudit).mockResolvedValue();
});

describe("a signed-in person's notifications", () => {
	it("are read for whoever is signed in, and marked read only when the page says so", async () => {
		const feed = (await (await send(MEMBER, "GET", "/notices")).json()) as NoticeFeed;
		expect(feed).toEqual({ notices: [MUSIC], unread: 1 });
		expect(markNoticesSeen).not.toHaveBeenCalled();

		const read = (await (await send(MEMBER, "POST", "/notices/seen")).json()) as NoticeFeed;
		expect(read.unread).toBe(0);
		expect(markNoticesSeen).toHaveBeenCalledWith(MEMBER);
	});

	it("refuse somebody signed out", async () => {
		expect((await send(null, "GET", "/notices")).status).toBe(401);
	});
});

describe("the owner's notification routes", () => {
	/** `requireOwner` answers 404 so a manager learns nothing; `ownerGate.test.ts` walks the rest of the router. */
	it("refuse anybody but an owner as if they were not there", async () => {
		expect((await send(MEMBER, "POST", "/owner/notices", { title: "x", body: "y", tone: "info" })).status).toBe(404);
		expect(createNotice).not.toHaveBeenCalled();
	});

	it("post through the same schema as Discord, and record who did", async () => {
		const response = await send(OWNER, "POST", "/owner/notices", {
			title: "Music is down",
			body: "Soon.",
			tone: "problem",
		});

		expect(response.status).toBe(201);
		expect(createNotice).toHaveBeenCalledWith({ title: "Music is down", body: "Soon.", tone: "problem" }, OWNER);
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "notice.post", guildId: null }));
	});

	it("refuse a notification the schema would not store", async () => {
		const tooLong = { title: "x".repeat(101), body: "y", tone: "info" };

		expect((await send(OWNER, "POST", "/owner/notices", tooLong)).status).toBe(400);
		expect((await send(OWNER, "POST", "/owner/notices", { title: "x", body: "y", tone: "loud" })).status).toBe(400);
		expect((await send(OWNER, "PATCH", `/owner/notices/${MUSIC.id}`, {})).status).toBe(400);
		expect((await send(OWNER, "PATCH", "/owner/notices/not-an-id", { title: "x" })).status).toBe(400);
		expect(createNotice).not.toHaveBeenCalled();
		expect(updateNotice).not.toHaveBeenCalled();
	});

	/** The times are judged by the same rule as on Discord, so a hand-written request cannot schedule one in the past. */
	it("refuse a time the rule will not keep, in words", async () => {
		const past = new Date(Date.now() - 60_000).toISOString();

		const response = await send(OWNER, "POST", "/owner/notices", {
			title: "x",
			body: "y",
			tone: "info",
			startsAt: past,
		});

		expect(response.status).toBe(400);
		expect(((await response.json()) as { error: { message: string } }).error.message).toMatch(/already gone/);
		expect(createNotice).not.toHaveBeenCalled();
	});

	it("say so in words when the cap is reached", async () => {
		jest.mocked(createNotice).mockResolvedValue(null);

		const response = await send(OWNER, "POST", "/owner/notices", { title: "x", body: "y", tone: "info" });

		expect(response.status).toBe(400);
		expect(((await response.json()) as { error: { message: string } }).error.message).toMatch(/Remove one/);
	});

	it("tell everybody again, and remove", async () => {
		expect((await send(OWNER, "PATCH", `/owner/notices/${MUSIC.id}`, { notifyAgain: true })).status).toBe(200);
		expect(updateNotice).toHaveBeenCalledWith(MUSIC.id, { notifyAgain: true });

		expect((await send(OWNER, "DELETE", `/owner/notices/${MUSIC.id}`)).status).toBe(204);
		expect(deleteNotice).toHaveBeenCalledWith(MUSIC.id);
	});
});
