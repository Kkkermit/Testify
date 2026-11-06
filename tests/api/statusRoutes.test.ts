import { Hono } from "hono";
import { answerLikeTheApp } from "../helpers/apiHarness";
import { type ApiBindings } from "@api/context";
import { forgetStatus, status } from "@api/routes/status";
import { type TestifyClient } from "@core/client";
import { statusReport } from "@lib/bot";
import { type StatusResponse } from "@testify/shared";

jest.mock("@lib/bot", () => ({ statusReport: jest.fn() }));

const REPORT = { level: "operational" } as StatusResponse;

function appFor(signedIn: boolean): Hono<ApiBindings> {
	const app = new Hono<ApiBindings>();
	app.use("*", async (context, next) => {
		context.set("client", {} as TestifyClient);
		if (signedIn) context.set("session", { _id: "s", userId: "100000000000000002" } as never);
		await next();
	});
	app.route("/status", status);
	answerLikeTheApp(app);

	return app;
}

beforeEach(() => {
	jest.clearAllMocks();
	forgetStatus();
	jest.mocked(statusReport).mockResolvedValue(REPORT);
});

describe("GET /status", () => {
	/** The status page is the website's, so somebody signed out, or on a host with no dashboard, can read it. */
	it("answers somebody signed out", async () => {
		const answer = await appFor(false).request("/status");

		expect(answer.status).toBe(200);
		expect(await answer.json()).toEqual(REPORT);
	});

	/** Every open tab polls, and each report pings the database. */
	it("reuses a report for a few seconds rather than rebuilding it per request", async () => {
		const app = appFor(true);

		await app.request("/status");
		await app.request("/status");

		expect(statusReport).toHaveBeenCalledTimes(1);
	});
});
