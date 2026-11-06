import { Hono } from "hono";
import { answerLikeTheApp, withSession } from "../helpers/apiHarness";
import { type ApiBindings } from "@api/context";
import { appeals } from "@api/routes/appeals";
import { type TestifyClient } from "@core/client";
import { readOwnAppeals, submitAppeal } from "@lib/appeals";

jest.mock("@database/repositories/blacklistRepository", () => ({
	findBlacklistEntry: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@lib/appeals", () => ({
	readOwnAppeals: jest.fn(() => Promise.resolve({ servers: [], appeals: [] })),
	submitAppeal: jest.fn(() => Promise.resolve({ id: "a".repeat(24) })),
}));

const KATE = "100000000000000001";
const GUILD = "900000000000000001";

function app(): Hono<ApiBindings> {
	const instance = new Hono<ApiBindings>();
	withSession(instance, {} as TestifyClient, { userId: KATE, username: "kate" });
	instance.route("/appeals", appeals);
	answerLikeTheApp(instance);
	return instance;
}

async function post(path: string, body: unknown): Promise<Response> {
	return await app().request(path, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("the appeal routes", () => {
	/** Whose appeal it is comes from the session, so a request cannot appeal in somebody else's name. */
	it("appeals as the signed-in person whatever the body says", async () => {
		const response = await post(`/appeals/${GUILD}`, {
			text: "I was spamming, and I will not again.",
			userId: "100000000000000009",
			username: "someone-else",
		});

		expect(response.status).toBe(201);
		expect(submitAppeal).toHaveBeenCalledWith(
			expect.anything(),
			GUILD,
			{ id: KATE, username: "kate" },
			"I was spamming, and I will not again.",
		);
	});

	it("reads only the signed-in person's own appeals", async () => {
		await app().request("/appeals?userId=100000000000000009");

		expect(readOwnAppeals).toHaveBeenCalledWith(expect.anything(), KATE);
	});

	it("refuses an appeal too short to read, and a server id that is not one", async () => {
		expect((await post(`/appeals/${GUILD}`, { text: "let me in" })).status).toBe(400);
		expect((await post("/appeals/not-a-server", { text: "I was spamming, and I will not again." })).status).toBe(400);
		expect(submitAppeal).not.toHaveBeenCalled();
	});
});
