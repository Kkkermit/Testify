import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { deleteLevelSettings, getLevelSettings, saveLevelSettings } from "@database/repositories/levelRepository";
import { normaliseSettings, sortRewards } from "@lib/levelling.util";
import {
	boostsSchema,
	ignoresSchema,
	type LevelConfigResponse,
	levellingPatchSchema,
	rewardsSchema,
} from "@testify/shared";

type ApiContext = Context<ApiBindings>;

export const levelling = new Hono<ApiBindings>();

levelling.use("*", requireGuild);

function guildIdOf(context: ApiContext): string {
	const guild = context.get("guild");
	// `requireGuild` sets this before any handler runs; reaching here without it is a wiring mistake.
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	return guild.id;
}

/**
 * Literally the output of `normaliseSettings`. The migration off the old single-`roleId` shape, the `"current"`
 * channel sentinel and the clamping all already happen there, so the web inherits them — and cannot drift from
 * what `/levelling edit` shows in Discord.
 */
async function configOf(guildId: string): Promise<LevelConfigResponse> {
	return normaliseSettings(await getLevelSettings(guildId));
}

levelling.get("/", async (context) => context.json(await configOf(guildIdOf(context))));

levelling.patch("/", async (context) => {
	const guildId = guildIdOf(context);
	const patch = await parseBody(context, levellingPatchSchema);
	const before = await configOf(guildId);

	await saveLevelSettings(guildId, {
		// The stored field is the inverse, and has been since the first version.
		...(patch.enabled === undefined ? {} : { isDisabled: !patch.enabled }),
		...(patch.announce === undefined ? {} : { announce: patch.announce }),
		...(patch.stackRewards === undefined ? {} : { stackRewards: patch.stackRewards }),
		...(patch.levelUpChannelId === undefined ? {} : { levelUpChannelId: patch.levelUpChannelId }),
	});

	const after = await configOf(guildId);
	await auditChange(context, {
		action: "levelling.update",
		summary: summarisePatch(patch),
		before: pick(before, patch),
		after: pick(after, patch),
	});

	return context.json(after);
});

levelling.put("/boosts", async (context) => {
	const guildId = guildIdOf(context);
	const boosts = await parseBody(context, boostsSchema);
	const before = await configOf(guildId);

	await saveLevelSettings(guildId, { boosts });

	await auditChange(context, {
		action: "levelling.boosts.update",
		summary: `Set ${count(boosts.length, "boost role")}`,
		before: { boosts: before.boosts },
		after: { boosts },
	});

	return context.json(await configOf(guildId));
});

levelling.put("/rewards", async (context) => {
	const guildId = guildIdOf(context);
	const rewards = await parseBody(context, rewardsSchema);
	const before = await configOf(guildId);

	// Stored sorted, so every reader gets them in order without sorting again.
	await saveLevelSettings(guildId, { rewards: sortRewards(rewards) });

	await auditChange(context, {
		action: "levelling.rewards.update",
		summary: `Set ${count(rewards.length, "role reward")}`,
		before: { rewards: before.rewards },
		after: { rewards },
	});

	return context.json(await configOf(guildId));
});

levelling.put("/ignores", async (context) => {
	const guildId = guildIdOf(context);
	const ignores = await parseBody(context, ignoresSchema);
	const before = await configOf(guildId);

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

	return context.json(await configOf(guildId));
});

/** Clears the configuration only. Everyone keeps the XP they earned, which the response says out loud. */
levelling.delete("/", async (context) => {
	const guildId = guildIdOf(context);
	const before = await configOf(guildId);

	await deleteLevelSettings(guildId);
	await auditChange(context, {
		action: "levelling.reset",
		summary: "Cleared the levelling configuration",
		before,
	});

	return context.json({
		config: await configOf(guildId),
		message: "Levelling settings cleared. Nobody lost the XP they had already earned.",
	});
});

function count(value: number, noun: string): string {
	return `${String(value)} ${noun}${value === 1 ? "" : "s"}`;
}

function pick(config: LevelConfigResponse, patch: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.keys(patch).map((key) => [key, config[key as keyof LevelConfigResponse]]));
}

/** Read on the overview's recent-changes card, so it has to say what changed without opening the diff. */
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
