import { Collection } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, problemBody } from "@api/errors";
import { roleMenus } from "@api/routes/roleMenus";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { countRoleMenus, createRoleMenu, findRoleMenu } from "@database/repositories/roleMenuRepository";
import { changeRoleMenu } from "@lib/roles/roleMenuActions.util";
import { BOT_ABOVE_ROLES, grantableRoles } from "@tests/helpers/mocks";

jest.mock("@database/repositories/roleMenuRepository", () => ({
	countRoleMenus: jest.fn(() => Promise.resolve(0)),
	createRoleMenu: jest.fn(() => Promise.resolve({})),
	deleteRoleMenu: jest.fn(() => Promise.resolve(null)),
	findRoleMenu: jest.fn(() => Promise.resolve(null)),
	listRoleMenus: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/roles/roleMenuActions.util", () => ({
	...jest.requireActual<object>("@lib/roles/roleMenuActions.util"),
	changeRoleMenu: jest.fn(),
	publishRoleMenu: jest.fn(() => Promise.resolve("500000000000000001")),
	takeDownRoleMenu: jest.fn(() => Promise.resolve()),
}));

const GUILD = "900000000000000001";
const OWNER = "100000000000000001";
const MENU_ID = "6650a1b2c3d4e5f6a7b8c9d0";
const BODY = {
	channelId: "400000000000000001",
	title: "Pings",
	description: "",
	roleIds: ["300000000000000001"],
	mode: "many",
};
const STORED = { ...BODY, id: MENU_ID, guildId: GUILD, messageId: null, updatedBy: null };

function app(): Hono<ApiBindings> {
	const guild = {
		id: GUILD,
		name: "Test Server",
		roles: { cache: grantableRoles() },
		members: { me: BOT_ABOVE_ROLES },
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
		context.set("session", { _id: "s", userId: OWNER, username: "someone" } as never);
		await next();
	});
	instance.route("/guilds/:guildId/role-menus", roleMenus);
	instance.onError((error) => {
		const problem = error instanceof ApiProblem ? error : new ApiProblem(500, "internal", "boom");
		return Response.json(problemBody(problem), { status: problem.status });
	});

	return instance;
}

async function send(method: string, path: string, body?: unknown): Promise<Response> {
	return app().request(`/guilds/${GUILD}/role-menus${path}`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(findRoleMenu).mockResolvedValue(null);
});

describe("the role menu routes", () => {
	it("refuses a menu with no roles, or more than a select can hold", async () => {
		expect((await send("POST", "", { ...BODY, roleIds: [] })).status).toBe(400);
		expect(
			(await send("POST", "", { ...BODY, roleIds: Array.from({ length: 26 }, () => BODY.roleIds[0]) })).status,
		).toBe(400);
		expect(createRoleMenu).not.toHaveBeenCalled();
	});

	it("stops at the limit", async () => {
		jest.mocked(countRoleMenus).mockResolvedValue(10);

		expect((await send("POST", "", BODY)).status).toBe(400);
		expect(createRoleMenu).not.toHaveBeenCalled();
	});

	/** The id is looked up inside this server, so a menu from another server is simply not there. */
	it("answers 404 for a menu this server does not have", async () => {
		expect((await send("PUT", `/${MENU_ID}`, BODY)).status).toBe(404);
		expect(findRoleMenu).toHaveBeenCalledWith(GUILD, MENU_ID);
		expect(changeRoleMenu).not.toHaveBeenCalled();
	});

	it("refuses an id that is not one", async () => {
		expect((await send("DELETE", "/$where")).status).toBe(400);
		expect(findRoleMenu).not.toHaveBeenCalled();
	});

	/** The change is saved either way; the refusal is what tells the manager the post did not follow. */
	it("reports a post that could not follow a change", async () => {
		jest.mocked(findRoleMenu).mockResolvedValue(STORED as never);
		jest
			.mocked(changeRoleMenu)
			.mockResolvedValue({ menu: STORED as never, note: "Saved, but the post was not updated." });

		const response = await send("PUT", `/${MENU_ID}`, BODY);

		expect(response.status).toBe(400);
		expect(await response.text()).toContain("Saved, but the post was not updated.");
	});
});
