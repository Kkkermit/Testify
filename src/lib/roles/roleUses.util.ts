import { getAutoRoles } from "@database/repositories/autoRoleRepository";
import { getLevelSettings } from "@database/repositories/levelRepository";
import { getMusicSettings } from "@database/repositories/musicSettingsRepository";
import { getRaidSettings } from "@database/repositories/raidRepository";
import { listRoleMenus } from "@database/repositories/roleMenuRepository";
import { listShopRoles } from "@database/repositories/shopRoleRepository";
import { getTicketSetup } from "@database/repositories/ticketRepository";
import { getVerifyConfig } from "@database/repositories/verificationRepository";
import { normaliseSettings } from "@lib/levelling/levelling.util";
import { type BotFeature, type GuildRoleUses, type RoleUse } from "@testify/shared";

/** What gives or reads each role in a server, one read per feature through the repositories its panels use. */
/** The feature behind each use, so a use a switched-off feature makes is not listed as one deleting the role would stop. */
const USED_BY: Partial<Record<RoleUse["kind"], BotFeature>> = {
	levelReward: "levelling",
	levelBoost: "levelling",
	levelIgnored: "levelling",
	dj: "music",
	ticketStaff: "tickets",
	shop: "economy",
};

export async function readRoleUses(guildId: string, off: ReadonlySet<BotFeature> = new Set()): Promise<GuildRoleUses> {
	const [level, autoRoles, menus, music, tickets, raid, verify, shop] = await Promise.all([
		getLevelSettings(guildId),
		getAutoRoles(guildId),
		listRoleMenus(guildId),
		getMusicSettings(guildId),
		getTicketSetup(guildId),
		getRaidSettings(guildId),
		getVerifyConfig(guildId),
		listShopRoles(guildId),
	]);
	const levelling = normaliseSettings(level);

	const pairs: [string, RoleUse][] = [
		...levelling.rewards.map((reward): [string, RoleUse] => [
			reward.roleId,
			{ kind: "levelReward", level: reward.level },
		]),
		...levelling.boosts.map((boost): [string, RoleUse] => [
			boost.roleId,
			{ kind: "levelBoost", multiplier: boost.multiplier },
		]),
		...levelling.ignoredRoleIds.map((roleId): [string, RoleUse] => [roleId, { kind: "levelIgnored" }]),
		...(autoRoles?.roleIds ?? []).map((roleId): [string, RoleUse] => [roleId, { kind: "joinRole" }]),
		...menus.flatMap((menu) =>
			menu.roleIds.map((roleId): [string, RoleUse] => [
				roleId,
				{ kind: "roleMenu", menuId: menu.id, title: menu.title },
			]),
		),
		...(music?.djRoleIds ?? []).map((roleId): [string, RoleUse] => [roleId, { kind: "dj" }]),
		...(tickets?.handlerRoleId ? [[tickets.handlerRoleId, { kind: "ticketStaff" }] as [string, RoleUse]] : []),
		...(raid?.pingRoleId ? [[raid.pingRoleId, { kind: "raidPing" }] as [string, RoleUse]] : []),
		...(verify?.roleId ? [[verify.roleId, { kind: "verified" }] as [string, RoleUse]] : []),
		...shop.map((entry): [string, RoleUse] => [entry.roleId, { kind: "shop", price: entry.price }]),
	];

	const uses: Record<string, RoleUse[]> = {};
	for (const [roleId, use] of pairs) {
		const feature = USED_BY[use.kind];
		if (feature === undefined || !off.has(feature)) (uses[roleId] ??= []).push(use);
	}
	return { uses };
}
