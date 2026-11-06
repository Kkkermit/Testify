import { PermissionsBitField } from "discord.js";
import { adjustWallet, debitWallet } from "@database/repositories/economyRepository";
import { countShopRoles, findShopRole, removeShopRole, saveShopRole } from "@database/repositories/shopRoleRepository";
import { buyShopRole, sellShopRole, withdrawShopRole } from "@lib/economy/shopRoles.util";

jest.mock("@database/repositories/economyRepository", () => ({
	adjustWallet: jest.fn(() => Promise.resolve({})),
	debitWallet: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@database/repositories/shopRoleRepository", () => ({
	countShopRoles: jest.fn(() => Promise.resolve(0)),
	findShopRole: jest.fn(() => Promise.resolve({ roleId: "300000000000000001", price: 500 })),
	listShopRoles: jest.fn(() => Promise.resolve([])),
	removeShopRole: jest.fn(() => Promise.resolve(true)),
	saveShopRole: jest.fn(() => Promise.resolve()),
}));

const GUILD = "900000000000000001";
const VIP = "300000000000000001";
const MODS = "300000000000000002";

function role(id: string, position: number, permissions: bigint[] = []) {
	return {
		id,
		name: id === VIP ? "VIP" : "Mods",
		position,
		managed: false,
		permissions: new PermissionsBitField(permissions),
	};
}

function world(options: { holds?: boolean; refuses?: boolean; permissions?: bigint[] } = {}) {
	const roles = new Map([
		[VIP, role(VIP, 2)],
		[MODS, role(MODS, 3, [PermissionsBitField.Flags.KickMembers])],
	]);
	const guild = {
		id: GUILD,
		ownerId: "1",
		roles: { cache: roles, everyone: { id: GUILD } },
		members: {
			me: { roles: { highest: { position: 10 } }, permissions: new PermissionsBitField(PermissionsBitField.All) },
		},
	};
	const member = {
		id: "100000000000000002",
		permissions: new PermissionsBitField(options.permissions ?? []),
		roles: {
			highest: { position: 5 },
			cache: new Map(options.holds === true ? [[VIP, roles.get(VIP)]] : []),
			add: jest.fn(() => (options.refuses === true ? Promise.reject(new Error("50013")) : Promise.resolve())),
		},
	};
	return { guild: guild as never, member: member as never, raw: member };
}

beforeEach(() => jest.clearAllMocks());

describe("buyShopRole", () => {
	/** Debit before you deliver: the role is only handed over once the money has left the wallet. */
	it("takes the money and then gives the role", async () => {
		const { guild, member, raw } = world();

		await buyShopRole(guild, member, VIP);

		expect(debitWallet).toHaveBeenCalledWith(GUILD, raw.id, 500);
		expect(raw.roles.add).toHaveBeenCalled();
		expect(jest.mocked(debitWallet).mock.invocationCallOrder[0]).toBeLessThan(
			raw.roles.add.mock.invocationCallOrder[0] ?? 0,
		);
	});

	/** Nobody should pay for a role Discord would not let the bot give. */
	it("gives the money back when Discord refuses the role", async () => {
		const { guild, member, raw } = world({ refuses: true });

		await expect(buyShopRole(guild, member, VIP)).rejects.toThrow(/money has been given back/);
		expect(adjustWallet).toHaveBeenCalledWith(GUILD, raw.id, 500);
	});

	it("charges nothing for a role already held, or one that cannot be afforded", async () => {
		await expect(buyShopRole(world({ holds: true }).guild, world({ holds: true }).member, VIP)).rejects.toThrow(
			/already have/,
		);
		jest.mocked(debitWallet).mockResolvedValueOnce(null);
		const { guild, member, raw } = world();

		await expect(buyShopRole(guild, member, VIP)).rejects.toThrow(/afford/);
		expect(raw.roles.add).not.toHaveBeenCalled();
	});
});

describe("sellShopRole", () => {
	/** A role that can kick, sold for coins, would let anybody with enough money kick. */
	it("refuses a role that moderates, and an eleventh role", async () => {
		const { guild } = world();

		await expect(sellShopRole(guild, undefined, MODS, 100, "1")).rejects.toThrow(/moderation or admin/);
		jest.mocked(findShopRole).mockResolvedValueOnce(null);
		jest.mocked(countShopRoles).mockResolvedValueOnce(10);
		await expect(sellShopRole(guild, undefined, VIP, 100, "1")).rejects.toThrow(/already sells 10/);
		expect(saveShopRole).not.toHaveBeenCalled();
	});
});

/** The route and `/economy shop-role` both ask Manage Roles, and so does the action, so a new caller cannot skip it. */
describe("who may change what the shop sells", () => {
	it("refuses somebody who can manage the server but not its roles, and changes nothing", async () => {
		const { guild, member } = world({ permissions: [PermissionsBitField.Flags.ManageGuild] });

		await expect(sellShopRole(guild, member, VIP, 100, "1")).rejects.toThrow(/Manage Roles/);
		await expect(withdrawShopRole(guild, member, VIP)).rejects.toThrow(/Manage Roles/);
		expect(saveShopRole).not.toHaveBeenCalled();
		expect(removeShopRole).not.toHaveBeenCalled();
	});

	it("lets somebody with Manage Roles sell a role below their own and take it off again", async () => {
		const { guild, member } = world({ permissions: [PermissionsBitField.Flags.ManageRoles] });

		await sellShopRole(guild, member, VIP, 100, "1");
		await withdrawShopRole(guild, member, VIP);
		expect(saveShopRole).toHaveBeenCalledWith(GUILD, VIP, 100, "1");
		expect(removeShopRole).toHaveBeenCalledWith(GUILD, VIP);
	});
});
