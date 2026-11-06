import { Collection, PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { answerLikeTheApp, withSession } from "../helpers/apiHarness";
import { type ApiBindings } from "@api/context";
import { guildShopRoles } from "@api/routes/guildShopRoles";
import { type TestifyClient } from "@core/client";

jest.mock("@database/repositories/shopRoleRepository", () => ({
	listShopRoles: jest.fn(() => Promise.resolve([{ roleId: "300000000000000001", price: 500 }])),
}));

const GUILD = "900000000000000001";
const ROLES = "100000000000000002";
const MANAGES_ONLY = "100000000000000003";

function read(userId: string): Promise<Response> {
	const member = (flags: bigint[]) => ({
		permissions: { has: (asked: bigint | bigint[]) => [asked].flat().every((flag) => flags.includes(flag)) },
	});
	const guild = {
		id: GUILD,
		name: "Test Server",
		roles: { cache: new Map() },
		members: {
			me: { roles: { highest: { position: 10 } } },
			fetch: (id: string) =>
				Promise.resolve(
					member(
						id === ROLES
							? [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageRoles]
							: [PermissionFlagsBits.ManageGuild],
					),
				),
		},
	};
	const client = {
		guilds: { cache: new Collection<string, unknown>([[GUILD, guild]]) },
		isOwner: () => false,
		logger: { error: jest.fn() },
	} as unknown as TestifyClient;
	const app = new Hono<ApiBindings>();
	withSession(app, client, { userId });
	app.route("/guilds/:guildId/shop-roles", guildShopRoles);
	answerLikeTheApp(app);

	return Promise.resolve(app.request(`/guilds/${GUILD}/shop-roles`));
}

describe("the shop roles read", () => {
	/** A manager without Manage Roles may see what is on sale, but the page must not offer them the controls. */
	it("says whether the person reading may change what the shop sells", async () => {
		const withRoles = await read(ROLES);
		const without = await read(MANAGES_ONLY);

		expect(withRoles.status).toBe(200);
		expect(await withRoles.json()).toMatchObject({ canManage: true, roles: [{ price: 500 }] });
		expect(await without.json()).toMatchObject({ canManage: false, roles: [{ price: 500 }] });
	});
});
