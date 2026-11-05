import { getAutoRoles } from "@database/repositories/autoRoleRepository";
import { getLevelSettings } from "@database/repositories/levelRepository";
import { getMusicSettings } from "@database/repositories/musicSettingsRepository";
import { getRaidSettings } from "@database/repositories/raidRepository";
import { listRoleMenus } from "@database/repositories/roleMenuRepository";
import { getTicketSetup } from "@database/repositories/ticketRepository";
import { getVerifyConfig } from "@database/repositories/verificationRepository";
import { readRoleUses } from "@lib/roles/roleUses.util";

jest.mock("@database/repositories/autoRoleRepository", () => ({ getAutoRoles: jest.fn() }));
jest.mock("@database/repositories/levelRepository", () => ({ getLevelSettings: jest.fn() }));
jest.mock("@database/repositories/musicSettingsRepository", () => ({ getMusicSettings: jest.fn() }));
jest.mock("@database/repositories/raidRepository", () => ({ getRaidSettings: jest.fn() }));
jest.mock("@database/repositories/roleMenuRepository", () => ({ listRoleMenus: jest.fn() }));
jest.mock("@database/repositories/ticketRepository", () => ({ getTicketSetup: jest.fn() }));
jest.mock("@database/repositories/verificationRepository", () => ({ getVerifyConfig: jest.fn() }));

describe("readRoleUses", () => {
	/** One role can be given by levelling and offered on a menu at once, and deleting it stops both. */
	it("lists every feature that gives or reads each role, and nothing for a server that set none", async () => {
		jest.mocked(getLevelSettings).mockResolvedValue({
			enabled: true,
			rewards: [{ level: 10, roleId: "r1" }],
			boosts: [{ roleId: "r2", multiplier: 1.5 }],
			ignoredRoleIds: ["r3"],
		} as never);
		jest.mocked(getAutoRoles).mockResolvedValue({ roleIds: ["r4"] } as never);
		jest.mocked(listRoleMenus).mockResolvedValue([{ id: "m1", title: "Pronouns", roleIds: ["r1", "r5"] }] as never);
		jest.mocked(getMusicSettings).mockResolvedValue({ enabled: true, djRoleIds: ["r6"] });
		jest.mocked(getTicketSetup).mockResolvedValue({ handlerRoleId: "r7" } as never);
		jest.mocked(getRaidSettings).mockResolvedValue({ pingRoleId: null } as never);
		jest.mocked(getVerifyConfig).mockResolvedValue({ roleId: "r8" } as never);

		const { uses } = await readRoleUses("900000000000000001");

		expect(uses.r1).toEqual([
			{ kind: "levelReward", level: 10 },
			{ kind: "roleMenu", menuId: "m1", title: "Pronouns" },
		]);
		expect(Object.keys(uses).sort()).toEqual(["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"]);
	});

	it("reads an unconfigured server as using no role at all", async () => {
		jest.mocked(getLevelSettings).mockResolvedValue(null);
		jest.mocked(getAutoRoles).mockResolvedValue(null);
		jest.mocked(listRoleMenus).mockResolvedValue([]);
		jest.mocked(getMusicSettings).mockResolvedValue(null);
		jest.mocked(getTicketSetup).mockResolvedValue(null);
		jest.mocked(getRaidSettings).mockResolvedValue(null);
		jest.mocked(getVerifyConfig).mockResolvedValue(null);

		expect(await readRoleUses("900000000000000001")).toEqual({ uses: {} });
	});
});
