import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { analytics } from "@api/routes/analytics";
import { control } from "@api/routes/control";
import { owner } from "@api/routes/owner";
import { createMockClient } from "@tests/helpers/mocks";

/** Every route the owner console calls, walked from the real routers so a new one cannot ship without the gate. */

const OWNER = "100000000000000001";
const MANAGER = "100000000000000002";
const OWNER_APPS = { "/api/owner": owner, "/api/analytics": analytics, "/api/control": control };

function appAs(userId: string | null): Hono<ApiBindings> {
	const client = createMockClient({ isOwner: (id: string) => id === OWNER });
	const app = new Hono<ApiBindings>();
	app.onError((error, context) =>
		error instanceof ApiProblem
			? context.json(problemBody(error), error.status as 400)
			: context.json({ error: { code: "reached" } }, 500),
	);
	app.use("*", async (context, next) => {
		context.set("client", client);
		if (userId !== null) context.set("session", { _id: "s", userId, csrfSecret: "secret" } as never);
		await next();
	});
	for (const [base, sub] of Object.entries(OWNER_APPS)) app.route(base, sub);
	return app;
}

/** Each concrete route with its parameters filled, skipping the `*` middleware entries. */
function everyRoute(): { method: string; path: string }[] {
	return Object.entries(OWNER_APPS).flatMap(([base, sub]) =>
		sub.routes
			.filter((route) => route.method !== "ALL" && !route.path.endsWith("*"))
			.map((route) => ({
				method: route.method,
				path: `${base}${route.path}`.replace(/:guildId|:userId/g, "900000000000000001").replace(/:\w+/g, "ping"),
			})),
	);
}

describe("the owner console's routes", () => {
	const routes = everyRoute();

	it("are found at all, so the walk below is not vacuous", () => {
		expect(routes.length).toBeGreaterThan(15);
		expect(routes).toEqual(expect.arrayContaining([{ method: "POST", path: "/api/owner/runner/ping" }]));
		expect(routes).toEqual(expect.arrayContaining([{ method: "POST", path: "/api/control/shutdown" }]));
		// Who ran what names people, so the drill-down has to be inside the walk too.
		expect(routes).toEqual(
			expect.arrayContaining([{ method: "GET", path: "/api/analytics/guilds/900000000000000001/runs" }]),
		);
	});

	/** Each route that answered anything else, by method and path, so one run names every hole. */
	async function answering(userId: string | null, expected: (status: number, body: unknown) => boolean) {
		const app = appAs(userId);
		const answers = await Promise.all(
			routes.map(async ({ method, path }) => {
				const response = await app.request(path, {
					method,
					headers: { "content-type": "application/json" },
					...(method === "GET" ? {} : { body: "{}" }),
				});
				const body: unknown = await response.json().catch(() => null);

				return expected(response.status, body) ? [] : [`${method} ${path} answered ${String(response.status)}`];
			}),
		);

		return answers.flat();
	}

	it("refuse a signed-in non-owner on every route with a bare 404", async () => {
		// Nothing but the error, so a refusal cannot carry a hint of what the route would have answered.
		const bare = (status: number, body: unknown): boolean =>
			status === 404 &&
			Object.keys(body ?? {}).join() === "error" &&
			(body as { error?: { code?: string } }).error?.code === "not_found";

		expect(await answering(MANAGER, bare)).toEqual([]);
	});

	it("refuse somebody signed out on every route", async () => {
		expect(await answering(null, (status) => status === 401)).toEqual([]);
	});

	it("let the owner through the access check the page asks first", async () => {
		expect((await appAs(OWNER).request("/api/owner/access")).status).toBe(204);
	});
});
