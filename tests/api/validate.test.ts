import { Hono } from "hono";
import { z } from "zod";
import { ApiProblem, problemBody } from "@api/errors";
import { parseBody, parseParams, parseQuery } from "@api/validate";
import { guildIdParam, pagination, snowflake } from "@testify/shared";

/** Mirrors how `createApi` maps a thrown problem, so these tests exercise the real refusal path. */
function appWith(register: (app: Hono) => void): Hono {
	const app = new Hono();
	register(app);
	app.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});
	return app;
}

async function bodyOf(response: Response): Promise<{ code: string; message: string; issues?: { path: string }[] }> {
	return ((await response.json()) as { error: { code: string; message: string; issues?: { path: string }[] } }).error;
}

describe("parseParams", () => {
	const app = appWith((instance) => {
		instance.get("/guilds/:guildId", (context) => context.json(parseParams(context, guildIdParam)));
	});

	it("hands a valid parameter through", async () => {
		expect(await (await app.request("/guilds/123456789012345678")).json()).toEqual({
			guildId: "123456789012345678",
		});
	});

	/** An unvalidated snowflake becomes a Mongo filter, and a 500 is a worse answer than a 400. */
	it("refuses one that is not a Discord ID, naming the field", async () => {
		const response = await app.request("/guilds/not-an-id");
		const error = await bodyOf(response);

		expect(response.status).toBe(400);
		expect(error.code).toBe("invalid");
		expect(error.issues?.[0]?.path).toBe("guildId");
	});
});

describe("parseQuery", () => {
	const app = appWith((instance) => {
		instance.get("/audit", (context) => context.json(parseQuery(context, pagination)));
	});

	it("applies the defaults when nothing is given", async () => {
		expect(await (await app.request("/audit")).json()).toEqual({ page: 1, perPage: 25 });
	});

	it("refuses a page that would become a negative skip", async () => {
		expect((await app.request("/audit?page=0")).status).toBe(400);
	});
});

describe("parseBody", () => {
	const app = appWith((instance) => {
		instance.post("/thing", async (context) =>
			context.json(await parseBody(context, z.object({ roleId: snowflake, multiplier: z.number().min(1).max(5) }))),
		);
	});

	function post(body: string): RequestInit {
		return { method: "POST", headers: { "content-type": "application/json" }, body };
	}

	it("accepts a valid body", async () => {
		const response = await app.request("/thing", post(JSON.stringify({ roleId: "123456789012345678", multiplier: 3 })));

		expect(response.status).toBe(200);
	});

	/** Without this the JSON parse throws inside Hono and becomes a 500 that looks like a bug. */
	it("reports a body that is not JSON as the 400 it is", async () => {
		const response = await app.request("/thing", post("{ not json"));

		expect(response.status).toBe(400);
		expect((await bodyOf(response)).message).toMatch(/not valid JSON/i);
	});

	it("puts every issue on the field it belongs to, so a form can show them", async () => {
		const response = await app.request("/thing", post(JSON.stringify({ roleId: "nope", multiplier: 99 })));
		const error = await bodyOf(response);

		expect(response.status).toBe(400);
		expect(error.issues?.map((issue) => issue.path).sort()).toEqual(["multiplier", "roleId"]);
	});

	/** A field nobody declared must not reach a `$set`. */
	it("does not pass through anything the schema did not ask for", async () => {
		const response = await app.request(
			"/thing",
			post(JSON.stringify({ roleId: "123456789012345678", multiplier: 3, guildId: "999999999999999999" })),
		);

		expect(await response.json()).toEqual({ roleId: "123456789012345678", multiplier: 3 });
	});

	it("refuses an array where an object was expected", async () => {
		expect((await app.request("/thing", post("[]"))).status).toBe(400);
	});
});
