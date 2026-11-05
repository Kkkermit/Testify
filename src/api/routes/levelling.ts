import { PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { auditChange, auditSettings } from "@api/audit";
import { type ApiBindings, guildIdOf } from "@api/context";
import { requireGrantable, requirePermission } from "@api/middleware/reach";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { deleteLevelSettings, saveLevelSettings } from "@database/repositories/levelRepository";
import { sortRewards } from "@lib/levelling";
import { readLevelConfig } from "@lib/settings";
import { boostsSchema, ignoresSchema, levellingPatchSchema, rewardsSchema } from "@testify/shared";

export const levelling = new Hono<ApiBindings>();

levelling.use("*", requireGuild);

levelling.get("/", async (context) => context.json(await readLevelConfig(guildIdOf(context))));

levelling.patch("/", async (context) => {
	const guildId = guildIdOf(context);
	const patch = await parseBody(context, levellingPatchSchema);
	const before = await readLevelConfig(guildId);

	await saveLevelSettings(guildId, {
		// The stored field is the inverse, and has been since the first version.
		...(patch.enabled === undefined ? {} : { isDisabled: !patch.enabled }),
		...(patch.announce === undefined ? {} : { announce: patch.announce }),
		...(patch.stackRewards === undefined ? {} : { stackRewards: patch.stackRewards }),
		...(patch.levelUpChannelId === undefined ? {} : { levelUpChannelId: patch.levelUpChannelId }),
	});

	const after = await readLevelConfig(guildId);
	await auditSettings(context, { action: "levelling.update", summary: summarisePatch(patch), before, after });

	return context.json(after);
});

levelling.put("/boosts", async (context) => {
	const guildId = guildIdOf(context);
	const boosts = await parseBody(context, boostsSchema);
	const before = await readLevelConfig(guildId);

	await saveLevelSettings(guildId, { boosts });

	await auditChange(context, {
		action: "levelling.boosts.update",
		summary: `Set ${count(boosts.length, "boost role")}`,
		before: { boosts: before.boosts },
		after: { boosts },
	});

	return context.json(await readLevelConfig(guildId));
});

// The bot hands these roles out, so choosing them asks what `/autorole` asks.
levelling.put("/rewards", requirePermission(PermissionFlagsBits.ManageRoles), async (context) => {
	const guildId = guildIdOf(context);
	const rewards = await parseBody(context, rewardsSchema);
	requireGrantable(
		context,
		rewards.map((reward) => reward.roleId),
	);
	const before = await readLevelConfig(guildId);

	await saveLevelSettings(guildId, { rewards: sortRewards(rewards) });

	await auditChange(context, {
		action: "levelling.rewards.update",
		summary: `Set ${count(rewards.length, "role reward")}`,
		before: { rewards: before.rewards },
		after: { rewards },
	});

	return context.json(await readLevelConfig(guildId));
});

levelling.put("/ignores", async (context) => {
	const guildId = guildIdOf(context);
	const ignores = await parseBody(context, ignoresSchema);
	const before = await readLevelConfig(guildId);

	await saveLevelSettings(guildId, {
		ignoredChannelIds: ignores.channelIds,
		ignoredRoleIds: ignores.roleIds,
	});

	await auditChange(context, {
		action: "levelling.ignores.update",
		summary: `Ignoring ${count(ignores.channelIds.length, "channel")} and ${count(ignores.roleIds.length, "role")}`,
		before: { ignoredChannelIds: before.ignoredChannelIds, ignoredRoleIds: before.ignoredRoleIds },
		after: { ignoredChannelIds: ignores.channelIds, ignoredRoleIds: ignores.roleIds },
	});

	return context.json(await readLevelConfig(guildId));
});

/** Clears the configuration only. Everyone keeps the XP they earned, which the response says out loud. */
levelling.delete("/", async (context) => {
	const guildId = guildIdOf(context);
	const before = await readLevelConfig(guildId);

	await deleteLevelSettings(guildId);
	await auditChange(context, {
		action: "levelling.reset",
		summary: "Cleared the levelling configuration",
		before,
	});

	return context.json({
		config: await readLevelConfig(guildId),
		message: "Levelling settings cleared. Nobody lost the XP they had already earned.",
	});
});

function count(value: number, noun: string): string {
	return `${String(value)} ${noun}${value === 1 ? "" : "s"}`;
}

function summarisePatch(patch: Record<string, unknown>): string {
	const parts: string[] = [];

	if (patch.enabled !== undefined) parts.push(patch.enabled === true ? "Turned levelling on" : "Turned levelling off");
	if (patch.announce !== undefined) parts.push(patch.announce === true ? "Announcing level-ups" : "Silenced level-ups");
	if (patch.stackRewards !== undefined) {
		parts.push(patch.stackRewards === true ? "Rewards stack" : "Only the highest reward is kept");
	}
	if (patch.levelUpChannelId !== undefined) {
		parts.push(
			patch.levelUpChannelId === null ? "Announcing where they were talking" : "Changed the announcement channel",
		);
	}

	return parts.length === 0 ? "Changed the levelling settings" : parts.join(", ");
}
