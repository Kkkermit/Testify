import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { forgetStatus, status } from "@api/routes/status";
import { type TestifyClient } from "@core/client";
import { statusReport } from "@lib/bot";
import { type StatusResponse } from "@testify/shared";

jest.mock("@lib/bot", () => ({ statusReport: jest.fn() }));
jest.mock("@lib/music", () => ({ musicBinaries: jest.fn(() => ({ ytDlp: null, ffmpeg: null })) }));

const REPORT = { level: "operational" } as StatusResponse;

function appFor(signedIn: boolean): Hono<ApiBindings> {
	const app = new Hono<ApiBindings>();
	app.use("*", async (context, next) => {
		context.set("client", {} as TestifyClient);
		if (signedIn) context.set("session", { _id: "s", userId: "100000000000000002" } as never);
		await next();
	});
	app.route("/status", status);
	app.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return app;
}

beforeEach(() => {
	jest.clearAllMocks();
	forgetStatus();
	jest.mocked(statusReport).mockResolvedValue(REPORT);
});

describe("GET /status", () => {
	it("answers a signed-in manager, not only the owner", async () => {
		const response = await appFor(true).request("/status");

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(REPORT);
	});

	it("refuses an anonymous caller", async () => {
		expect((await appFor(false).request("/status")).status).toBe(401);
		expect(statusReport).not.toHaveBeenCalled();
	});

	/** Every open tab polls, and each report pings the database. */
	it("reuses a report for a few seconds rather than rebuilding it per request", async () => {
		const app = appFor(true);

		await app.request("/status");
		await app.request("/status");

		expect(statusReport).toHaveBeenCalledTimes(1);
	});
});
