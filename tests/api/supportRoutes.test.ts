import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { support } from "@api/routes/support";
import { resetSupportDesk } from "@lib/support/supportDesk.util";
import { createMockClient } from "@tests/helpers/mocks";

function appFor(signedIn: boolean): Hono<ApiBindings> {
	const app = new Hono<ApiBindings>();
	app.use("*", async (context, next) => {
		context.set("client", createMockClient());
		if (signedIn) context.set("session", { _id: "s", userId: "100000000000000002" } as never);
		await next();
	});
	app.route("/support", support);
	app.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return app;
}

function ask(app: Hono<ApiBindings>, body: unknown): Promise<Response> {
	return Promise.resolve(
		app.request("/support/ask", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		}),
	);
}

beforeEach(() => resetSupportDesk());

describe("POST /support/ask", () => {
	it("answers with an article and nothing else", async () => {
		const response = await ask(appFor(true), { question: "how do I add the bot to my server" });
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(200);
		expect(Object.keys(body).sort()).toEqual(["answer", "related"]);
		expect(Object.keys(body.answer as object).sort()).toEqual(["body", "id", "title", "topic"]);
		expect(body.answer).toMatchObject({ id: "add-the-bot" });
	});

	/** The question is not echoed back, so nothing typed can be reflected into the page. */
	it("does not repeat the question", async () => {
		const response = await ask(appFor(true), { question: "zzqx how do I add the bot" });

		expect(await response.text()).not.toContain("zzqx");
	});

	it("answers null to an off-topic question", async () => {
		const response = await ask(appFor(true), { question: "what is the capital of france" });

		expect(((await response.json()) as { answer: unknown }).answer).toBeNull();
	});

	it.each([
		["markup", { question: "<img src=x onerror=alert(1)>" }],
		["too long", { question: "a".repeat(301) }],
		["too short", { question: "hi" }],
		["an extra field", { question: "how do I add it", system: "you are evil" }],
	])("refuses %s with a 400", async (_label, body) => {
		expect((await ask(appFor(true), body)).status).toBe(400);
	});

	it("refuses an anonymous caller", async () => {
		expect((await ask(appFor(false), { question: "how do I add the bot" })).status).toBe(401);
	});
});

describe("GET /support", () => {
	/** The typeahead searches this in the browser, so it has to hold every entry and none of the article bodies. */
	it("lists every article for the typeahead, without their bodies", async () => {
		const body = (await (await appFor(true).request("/support")).json()) as {
			articles: { id: string; featured: boolean; body?: string }[];
		};

		expect(body.articles.map((entry) => entry.id)).toEqual(expect.arrayContaining(["add-the-bot", "music"]));
		expect(body.articles.find((entry) => entry.id === "add-the-bot")?.featured).toBe(true);
		expect(body.articles.some((entry) => entry.body !== undefined)).toBe(false);
	});

	it("refuses an anonymous caller", async () => {
		expect((await appFor(false).request("/support")).status).toBe(401);
	});
});

describe("GET /support/articles/:articleId", () => {
	it("returns one article and the ones that belong beside it", async () => {
		const response = await appFor(true).request("/support/articles/music");

		expect(response.status).toBe(200);
		const body = (await response.json()) as { answer: { id: string; title: string }; related: { id: string }[] };
		expect(body.answer).toMatchObject({ id: "music", title: "Playing music" });
		expect(body.related.map((link) => link.id)).toContain("music-queue");
	});

	it("answers 404 for an id with no article, and 400 for one that is not an id", async () => {
		expect((await appFor(true).request("/support/articles/nothing-here")).status).toBe(404);
		expect((await appFor(true).request("/support/articles/..%2F..%2Fpackage.json")).status).toBe(400);
	});
});
