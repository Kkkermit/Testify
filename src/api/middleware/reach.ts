import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { type Context } from "hono";
import { createMiddleware } from "hono/factory";
import { type ApiBindings } from "@api/context";
import { badRequest, forbidden, notInGuild } from "@api/errors";
import { humanisePermission } from "@lib/format";
import { grantProblem } from "@lib/roles";

/** Nothing on the web may reach further than its person could in Discord itself, whatever a request says. */

const SNOWFLAKE = /^\d{17,20}$/;

/** Whether the person reading holds a permission in this server; a bot owner, who need not be a member, always does. */
export function holdsPermission(context: Context<ApiBindings>, ...flags: bigint[]): boolean {
	return context.get("isOwner") === true || context.get("member")?.permissions.has(flags) === true;
}

/** The permission the matching Discord command asks for; a bot owner, who need not be a member, is not asked. */
export function demandPermission(context: Context<ApiBindings>, ...flags: bigint[]): void {
	if (!holdsPermission(context, ...flags)) {
		const names = new PermissionsBitField(flags).toArray().map(humanisePermission).join(" and ");
		throw forbidden("missing_permission", `You need the ${names} permission in that server to do that.`);
	}
}

export function requirePermission(...flags: bigint[]): ReturnType<typeof createMiddleware<ApiBindings>> {
	return createMiddleware<ApiBindings>(async (context, next) => {
		demandPermission(context, ...flags);
		await next();
	});
}

interface Named {
	channels: string[];
	targets: string[];
	roles: string[];
}

/** Deeper than any form the page sends, and shallow enough that a hostile body cannot exhaust the stack. */
const MAX_DEPTH = 16;

/** Snowflakes under a key naming a channel or a role, at any depth; a singular channel key is somewhere the bot posts. */
function collect(value: unknown, key: string, found: Named, depth = 0): Named {
	if (depth > MAX_DEPTH) throw badRequest("That request is nested too deeply.");

	if (Array.isArray(value)) {
		for (const item of value) collect(item, key, found, depth + 1);
	} else if (typeof value === "object" && value !== null) {
		for (const [inner, child] of Object.entries(value)) collect(child, inner, found, depth + 1);
	} else if (typeof value === "string" && SNOWFLAKE.test(value)) {
		if (/channel|category/i.test(key)) {
			found.channels.push(value);
			if (!key.endsWith("Ids")) found.targets.push(value);
		} else if (/role/i.test(key)) {
			found.roles.push(value);
		}
	}

	return found;
}

/**
 * Every channel and role a write names must be in this server, and a channel must be one its person can see — and post
 * in, where the bot will post — so a hand-written request cannot aim the bot at another server or a hidden channel.
 */
export const requireReach = createMiddleware<ApiBindings>(async (context, next) => {
	if (context.req.method === "GET" || context.req.method === "HEAD") {
		await next();
		return;
	}

	const guild = context.get("guild");
	if (guild === undefined) throw notInGuild();

	let body: unknown = null;
	try {
		body = await context.req.json();
	} catch {
		// An unreadable body is the route's own `parseBody` to refuse, with the message it always gives.
	}

	const named = collect(body, "", { channels: [], targets: [], roles: [] });
	const member = context.get("isOwner") === true ? undefined : context.get("member");

	for (const id of named.channels) {
		const channel = guild.channels.cache.get(id);
		if (channel === undefined) throw badRequest("That channel is not in this server.");

		const allowed = member?.permissionsIn(channel);
		if (allowed !== undefined && !allowed.has(PermissionFlagsBits.ViewChannel)) {
			throw forbidden(
				"channel_out_of_reach",
				"You cannot see that channel yourself, so you cannot point the bot at it.",
			);
		}
		// A voice channel's chat is text-based too, but the counters there are locked by design and never posted in.
		const postsHere = named.targets.includes(id) && channel.isTextBased() && !channel.isVoiceBased();
		if (allowed !== undefined && postsHere && !allowed.has(PermissionFlagsBits.SendMessages)) {
			throw forbidden(
				"channel_out_of_reach",
				"You cannot post in that channel yourself, so the bot cannot post there for you.",
			);
		}
	}

	for (const id of named.roles) {
		if (!guild.roles.cache.has(id)) throw badRequest("That role is not in this server.");
	}

	await next();
});

/** Refuses the whole write if any role in it is one the caller could not give out themselves. */
export function requireGrantable(
	context: Context<ApiBindings>,
	roleIds: readonly string[],
	rule: typeof grantProblem = grantProblem,
): void {
	const guild = context.get("guild");
	if (guild === undefined) throw notInGuild();
	const member = context.get("isOwner") === true ? undefined : context.get("member");

	for (const roleId of roleIds) {
		const problem = rule(member, roleId, guild);
		if (problem !== null) throw forbidden("role_out_of_reach", problem);
	}
}
