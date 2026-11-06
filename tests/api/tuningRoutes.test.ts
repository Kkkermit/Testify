import { Collection } from "discord.js";
import { Hono } from "hono";
import { answerLikeTheApp, withSession } from "../helpers/apiHarness";
import { type ApiBindings } from "@api/context";
import { guildTuning } from "@api/routes/guildTuning";
import { type TestifyClient } from "@core/client";
import { saveTuning } from "@database/repositories/tuningRepository";
import { DEFAULT_TUNING } from "@testify/shared";

jest.mock("@database/repositories/tuningRepository", () => {
	const { DEFAULT_TUNING: defaults } = jest.requireActual<{ DEFAULT_TUNING: object }>("@testify/shared");
	return {
		getTuning: jest.fn(() => Promise.resolve(defaults)),
		saveTuning: jest.fn((_guildId: string, changes: object) => Promise.resolve({ ...defaults, ...changes })),
	};
});
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";

function patch(body: unknown): Promise<Response> {
	const client = {
		guilds: { cache: new Collection<string, unknown>([[GUILD, { id: GUILD, name: "Test Server" }]]) },
		isOwner: (id: string) => id === OWNER,
		logger: { error: jest.fn() },
	} as unknown as TestifyClient;
	const app = new Hono<ApiBindings>();
	withSession(app, client, { userId: OWNER, username: "kate" });
	app.route("/guilds/:guildId/tuning", guildTuning);
	answerLikeTheApp(app);

	return Promise.resolve(
		app.request(`/guilds/${GUILD}/tuning`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		}),
	);
}

describe("the tuning routes", () => {
	/** Only the rates the panel offers can be stored, so a hand-written request cannot hand out 1,000% pay. */
	it("refuses a rate no list offers, and a starting wallet past the cap", async () => {
		expect((await patch({ payRate: 1_000 })).status).toBe(400);
		expect((await patch({ startingWallet: 1_000_000 })).status).toBe(400);
		expect((await patch({})).status).toBe(400);
		expect(saveTuning).not.toHaveBeenCalled();
	});

	it("saves a rate the list offers and answers with the whole record", async () => {
		const response = await patch({ xpRate: 200 });

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ...DEFAULT_TUNING, xpRate: 200 });
	});
});
