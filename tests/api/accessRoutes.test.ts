import { Collection, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { Hono } from "hono";
import { answerLikeTheApp, withSession } from "../helpers/apiHarness";
import { type ApiBindings } from "@api/context";
import { access } from "@api/routes/access";
import { type TestifyClient } from "@core/client";
import {
	addAccess,
	changeAccess,
	countAccess,
	findAccess,
	listAccess,
	removeAccess,
	type StoredAccess,
} from "@database/repositories/dashboardAccessRepository";
import { auditsBy, changesBy, recordAudit } from "@database/repositories/dashboardAuditRepository";
import { ACCESS_LIMITS, type AccessPerson } from "@testify/shared";

jest.mock("@database/repositories/dashboardAccessRepository", () => ({
	addAccess: jest.fn(),
	changeAccess: jest.fn(),
	countAccess: jest.fn(() => Promise.resolve(0)),
	findAccess: jest.fn(() => Promise.resolve(null)),
	listAccess: jest.fn(() => Promise.resolve([])),
	removeAccess: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("@database/repositories/dashboardAuditRepository", () => ({
	recordAudit: jest.fn(() => Promise.resolve()),
	auditsBy: jest.fn(() => Promise.resolve({ items: [], total: 0 })),
	changesBy: jest.fn(() => Promise.resolve(new Map())),
}));

const GUILD = "900000000000000001";
const ADMIN = "100000000000000001";
const MANAGER = "100000000000000002";
const HELPER = "100000000000000003";
const BOT = "100000000000000004";
const STRANGER = "100000000000000005";

const { Administrator, ManageGuild, BanMembers } = PermissionFlagsBits;

function member(id: string, permissions: bigint[], bot = false) {
	return {
		id,
		user: { id, username: `user-${id.slice(-1)}`, bot },
		permissions: new PermissionsBitField(permissions),
		displayAvatarURL: () => `https://cdn.discordapp.com/avatars/${id}/a.png`,
	};
}

const MEMBERS = new Map([
	[ADMIN, member(ADMIN, [Administrator])],
	[MANAGER, member(MANAGER, [ManageGuild])],
	[HELPER, member(HELPER, [BanMembers])],
	[BOT, member(BOT, [], true)],
]);

function stored(overrides: Partial<StoredAccess> = {}): StoredAccess {
	return {
		guildId: GUILD,
		userId: HELPER,
		username: "helper",
		areas: ["bans"],
		addedBy: ADMIN,
		addedByName: "admin",
		lastSeenAt: null,
		createdAt: new Date("2026-11-01T10:00:00Z"),
		updatedAt: new Date("2026-11-02T10:00:00Z"),
		...overrides,
	};
}

function app(as = ADMIN) {
	const guild = {
		id: GUILD,
		name: "Test Server",
		members: {
			cache: new Collection(MEMBERS),
			fetch: jest.fn((query: string | { user: string[] }) => {
				if (typeof query === "string") {
					const found = MEMBERS.get(query);
					return found === undefined ? Promise.reject(new Error("Unknown Member")) : Promise.resolve(found);
				}
				return Promise.resolve(
					new Collection(query.user.flatMap((id) => [MEMBERS.get(id)].flatMap((m) => (m ? [[id, m] as const] : [])))),
				);
			}),
		},
	};
	const client = {
		guilds: { cache: new Collection<string, unknown>([[GUILD, guild]]) },
		isOwner: () => false,
		logger: { error: jest.fn(), warn: jest.fn() },
	} as unknown as TestifyClient;

	const instance = new Hono<ApiBindings>();
	withSession(instance, client, { userId: as, username: "admin" });
	instance.route("/guilds/:guildId/access", access);
	answerLikeTheApp(instance);
	return instance;
}

const send = (method: string, path: string, body?: unknown, as?: string) =>
	app(as).request(`/guilds/${GUILD}/access${path}`, {
		method,
		headers: { "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});

async function codeOf(response: Response): Promise<string> {
	return ((await response.json()) as { error: { code: string } }).error.code;
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(addAccess).mockImplementation((fields) => Promise.resolve(stored({ ...fields })));
	jest.mocked(findAccess).mockResolvedValue(null);
	jest.mocked(countAccess).mockResolvedValue(0);
});

describe("the dashboard access routes", () => {
	/** Manage Server sees every screen but may not hand any out, so a manager cannot widen anybody's reach. */
	it("are refused to a manager without Administrator", async () => {
		const response = await send("GET", "", undefined, MANAGER);

		expect([response.status, await codeOf(response)]).toEqual([403, "missing_permission"]);
	});

	it("give a member the screens chosen, in a fixed order, and write it down", async () => {
		const response = await send("POST", "", { userId: HELPER, areas: ["warnings", "bans", "warnings"] });
		const person = (await response.json()) as AccessPerson;

		expect(response.status).toBe(201);
		expect(addAccess).toHaveBeenCalledWith(
			expect.objectContaining({ guildId: GUILD, userId: HELPER, areas: ["warnings", "bans"], addedBy: ADMIN }),
		);
		expect(person).toMatchObject({ userId: HELPER, username: "user-3", inServer: true, areas: ["warnings", "bans"] });
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "access.grant", guildId: GUILD }));
	});

	/** Each would be access that means nothing, or access that would let somebody act as the bot. */
	it("refuse a stranger, a bot, somebody who already sees everything, a second grant and the fifty-first", async () => {
		jest.mocked(addAccess).mockResolvedValueOnce(null);
		const duplicate = await codeOf(await send("POST", "", { userId: HELPER, areas: ["bans"] }));
		jest.mocked(countAccess).mockResolvedValueOnce(ACCESS_LIMITS.maxPeople);
		const full = await codeOf(await send("POST", "", { userId: HELPER, areas: ["bans"] }));

		expect({
			stranger: await codeOf(await send("POST", "", { userId: STRANGER, areas: ["bans"] })),
			bot: await codeOf(await send("POST", "", { userId: BOT, areas: ["bans"] })),
			manager: await codeOf(await send("POST", "", { userId: MANAGER, areas: ["bans"] })),
			duplicate,
			full,
		}).toEqual({
			stranger: "not_a_member",
			bot: "is_bot",
			manager: "already_full",
			duplicate: "already_given",
			full: "too_many",
		});
	});

	/** The areas are the boundary, so anything but a known screen, the panel itself included, is refused as malformed. */
	it("refuse a body naming no screen, an unknown screen, the access panel or a field it does not take", async () => {
		const bodies = [
			{ userId: HELPER, areas: [] },
			{ userId: HELPER, areas: ["owner"] },
			{ userId: HELPER, areas: ["access"] },
			{ userId: HELPER, areas: ["bans"], addedBy: STRANGER },
			{ userId: { $gt: "" }, areas: ["bans"] },
			{ userId: HELPER, areas: { $in: ["bans"] } },
		];

		const statuses = await Promise.all(bodies.map(async (body) => (await send("POST", "", body)).status));
		expect(statuses).toEqual(bodies.map(() => 400));
		expect(addAccess).not.toHaveBeenCalled();
	});

	it("list everybody with access, with who gave it and what they did", async () => {
		jest.mocked(listAccess).mockResolvedValueOnce([stored(), stored({ userId: STRANGER, username: "gone" })]);
		jest
			.mocked(changesBy)
			.mockResolvedValueOnce(new Map([[HELPER, { count: 4, last: new Date("2026-11-05T09:00:00Z") }]]));

		const { people } = (await (await send("GET", "")).json()) as { people: AccessPerson[] };

		expect(people).toEqual([
			expect.objectContaining({ userId: HELPER, inServer: true, changes: 4, lastChangeAt: "2026-11-05T09:00:00.000Z" }),
			expect.objectContaining({ userId: STRANGER, username: "gone", inServer: false, changes: 0, avatarUrl: null }),
		]);
		expect(people[0]?.addedBy).toEqual({ id: ADMIN, name: "admin" });
	});

	it("change, read and take away one person's access, and say so for somebody who has none", async () => {
		jest.mocked(findAccess).mockResolvedValue(stored());
		jest.mocked(changeAccess).mockResolvedValueOnce(stored({ areas: ["cases"] }));
		jest.mocked(auditsBy).mockResolvedValueOnce({
			items: [
				{
					actorTag: "helper",
					action: "member.unban",
					summary: "Unbanned spammer",
					at: new Date("2026-11-05T09:00:00Z"),
				},
			],
			total: 1,
		} as never);

		const changed = await send("PUT", `/${HELPER}`, { areas: ["cases"] });
		const activity = (await (await send("GET", `/${HELPER}`)).json()) as { items: { summary: string }[] };
		const removed = await send("DELETE", `/${HELPER}`);
		jest.mocked(findAccess).mockResolvedValue(null);
		const missing = await send("DELETE", `/${STRANGER}`);

		expect([changed.status, removed.status, missing.status]).toEqual([200, 204, 404]);
		expect(changeAccess).toHaveBeenCalledWith(GUILD, HELPER, ["cases"]);
		expect(activity.items.map((item) => item.summary)).toEqual(["Unbanned spammer"]);
		expect(auditsBy).toHaveBeenCalledWith(HELPER, 1, ACCESS_LIMITS.activityShown, GUILD);
		expect(removeAccess).toHaveBeenCalledWith(GUILD, HELPER);
		expect(jest.mocked(recordAudit).mock.calls.map(([entry]) => entry.action)).toEqual([
			"access.update",
			"access.revoke",
		]);
	});
});
