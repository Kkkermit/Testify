import { PermissionsBitField } from "discord.js";
import { strings } from "../config/strings";
import { findBlacklistEntry } from "../database/repositories/blacklistRepository";
import { formatDuration, humanisePermission } from "../ui/format";
import { type SharedCommand } from "./command";
import { type CommandContext } from "./context";

export type MiddlewareResult = { ok: true } | { ok: false; reason: string; ephemeral?: boolean };

export type Middleware = (ctx: CommandContext, command: SharedCommand) => Promise<MiddlewareResult>;

const OK: MiddlewareResult = { ok: true };

export const blacklistMiddleware: Middleware = async (ctx) => {
	const entry = await findBlacklistEntry(ctx.user.id);
	if (!entry) return OK;
	return { ok: false, reason: strings.generic.blacklisted(entry.reason), ephemeral: true };
};

export const underDevelopmentMiddleware: Middleware = (_ctx, command) =>
	Promise.resolve(
		command.underDevelopment === true ? { ok: false, reason: strings.generic.underDevelopment, ephemeral: true } : OK,
	);

export const guildOnlyMiddleware: Middleware = (ctx, command) =>
	Promise.resolve(
		command.guildOnly === true && !ctx.guild ? { ok: false, reason: strings.generic.guildOnly, ephemeral: true } : OK,
	);

export const ownerOnlyMiddleware: Middleware = (ctx, command) =>
	Promise.resolve(
		command.ownerOnly === true && !ctx.client.isOwner(ctx.user.id)
			? { ok: false, reason: strings.generic.ownerOnly, ephemeral: true }
			: OK,
	);

export const nsfwMiddleware: Middleware = (ctx, command) => {
	if (command.nsfw !== true) return Promise.resolve(OK);
	const channel = ctx.channel;
	const isNsfw = channel !== null && "nsfw" in channel && channel.nsfw;
	return Promise.resolve(isNsfw ? OK : { ok: false, reason: strings.generic.nsfwOnly, ephemeral: true });
};

/**
 * `member` is legitimately null in DMs. The previous gate dereferenced it anyway,
 * so any DM-usable command that declared permissions crashed.
 */
export const permissionMiddleware: Middleware = (ctx, command) => {
	if (!command.permissions || command.permissions.length === 0) return Promise.resolve(OK);
	if (!ctx.guild || !ctx.member) return Promise.resolve(OK);

	const missing = ctx.member.permissions.missing(new PermissionsBitField(command.permissions));
	if (missing.length === 0) return Promise.resolve(OK);

	return Promise.resolve({
		ok: false,
		reason: strings.permissions.userMissing(missing.map(humanisePermission)),
		ephemeral: true,
	});
};

/** The bot's own permissions were never checked before, so `/ban` failed with a raw API error. */
export const botPermissionMiddleware: Middleware = (ctx, command) => {
	if (!command.botPermissions || command.botPermissions.length === 0) return Promise.resolve(OK);
	const me = ctx.guild?.members.me;
	if (!me) return Promise.resolve(OK);

	const missing = me.permissions.missing(new PermissionsBitField(command.botPermissions));
	if (missing.length === 0) return Promise.resolve(OK);

	return Promise.resolve({
		ok: false,
		reason: strings.permissions.botMissing(missing.map(humanisePermission)),
		ephemeral: true,
	});
};

const cooldowns = new Map<string, number>();

export const cooldownMiddleware: Middleware = (ctx, command) => {
	if (command.cooldownMs === undefined || command.cooldownMs <= 0) return Promise.resolve(OK);
	if (ctx.client.isOwner(ctx.user.id)) return Promise.resolve(OK);

	const key = `${command.name}:${ctx.user.id}`;
	const now = Date.now();
	const readyAt = cooldowns.get(key) ?? 0;

	if (readyAt > now) {
		return Promise.resolve({
			ok: false,
			reason: strings.generic.cooldown(formatDuration(readyAt - now)),
			ephemeral: true,
		});
	}

	cooldowns.set(key, now + command.cooldownMs);
	if (cooldowns.size > 10_000) pruneCooldowns(now);
	return Promise.resolve(OK);
};

function pruneCooldowns(now: number): void {
	for (const [key, readyAt] of cooldowns) {
		if (readyAt <= now) cooldowns.delete(key);
	}
}

export function clearCooldowns(): void {
	cooldowns.clear();
}

/** One chain, both surfaces, short-circuiting on the first failure. */
export const DEFAULT_CHAIN: Middleware[] = [
	blacklistMiddleware,
	underDevelopmentMiddleware,
	ownerOnlyMiddleware,
	guildOnlyMiddleware,
	nsfwMiddleware,
	permissionMiddleware,
	botPermissionMiddleware,
	cooldownMiddleware,
];

export async function runMiddleware(
	ctx: CommandContext,
	command: SharedCommand,
	chain: Middleware[] = DEFAULT_CHAIN,
): Promise<MiddlewareResult> {
	for (const middleware of chain) {
		const result = await middleware(ctx, command);
		if (!result.ok) return result;
	}
	return OK;
}
