import { Collection, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, badRequest, problemBody } from "@api/errors";
import { bans } from "@api/routes/bans";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { deactivateSoftban, getActiveSoftban } from "@database/repositories/moderationRepository";
import { recordCase } from "@lib/moderation/caseActions.util";
import { type BanPage } from "@testify/shared";

jest.mock("@database/repositories/moderationRepository", () => ({
	listActiveSoftbans: jest.fn(() => Promise.resolve([])),
	getActiveSoftban: jest.fn(() => Promise.resolve(null)),
	deactivateSoftban: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/moderation/caseActions.util", () => ({
	...jest.requireActual<object>("@lib/moderation/caseActions.util"),
	recordCase: jest.fn(() => Promise.resolve(null)),
}));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const BANNED = "100000000000000002";

function app(options: { botCanBan?: boolean } = {}) {
	const user = { id: BANNED, username: "spammer", displayAvatarURL: () => null };
	const remove = jest.fn(() => Promise.resolve());
	const guild = {
		id: GUILD,
		name: "Test Server",
		members: {
			me: {
				permissions: new PermissionsBitField(options.botCanBan === false ? [] : [PermissionFlagsBits.BanMembers]),
			},
		},
		bans: {
			fetch: jest.fn((query?: unknown) =>
				typeof query === "string"
					? Promise.resolve({ user, reason: "spam" })
					: Promise.resolve(new Collection([[BANNED, { user, reason: "spam" }]])),
			),
			remove,
		},
	};
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
		context.set("session", { _id: "s", userId: OWNER, username: "owner" } as never);
		await next();
	});
	instance.route("/guilds/:guildId/bans", bans);
	instance.onError((error) => {
		const problem =
			error instanceof ApiProblem
				? error
				: error instanceof UserFacingError
					? badRequest(error.message)
					: new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});
	return { instance, remove };
}

const post = (instance: Hono<ApiBindings>, body: unknown = {}) =>
	instance.request(`/guilds/${GUILD}/bans/${BANNED}/unban`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getActiveSoftban).mockResolvedValue(null);
});

describe("the ban routes", () => {
	it("lists the server's bans", async () => {
		const page = (await (await app().instance.request(`/guilds/${GUILD}/bans`)).json()) as BanPage;

		expect(page).toEqual(expect.objectContaining({ readable: true, total: 1 }));
		expect(page.items[0]).toEqual(expect.objectContaining({ userId: BANNED, username: "spammer", reason: "spam" }));
	});

	it("lifts a ban as a case under the manager's name, and writes it down", async () => {
		const { instance, remove } = app();

		const response = await post(instance, { reason: "Appealed" });

		expect(response.status).toBe(200);
		expect(remove).toHaveBeenCalledWith(BANNED, "owner: Appealed");
		expect(recordCase).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ action: "unban", moderator: { id: OWNER, name: "owner" }, reason: "Appealed" }),
		);
		expect(recordAudit).toHaveBeenCalledWith(
			expect.objectContaining({ action: "member.unban", summary: "Unbanned spammer" }),
		);
	});

	/** Lifting a softban as a plain ban would leave its record active, and the job would unban them again later. */
	it("lifts a softban through its own record", async () => {
		jest.mocked(getActiveSoftban).mockResolvedValue({ userId: BANNED } as never);

		const response = await post(app().instance);

		expect(response.status).toBe(200);
		expect(deactivateSoftban).toHaveBeenCalledWith(GUILD, BANNED);
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "member.softban.revoke" }));
	});

	it("refuses when the bot cannot lift bans, before anything changes", async () => {
		const { instance, remove } = app({ botCanBan: false });

		const response = await post(instance);

		expect(response.status).toBe(403);
		expect(remove).not.toHaveBeenCalled();
		expect(recordAudit).not.toHaveBeenCalled();
	});
});
