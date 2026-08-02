import { type Guild, PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireOwner } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { ANALYTICS } from "@config/constants";
import { shutdown } from "@core/shutdown";
import { getLevelSettings } from "@database/repositories/levelRepository";
import { getAuditLogConfig, getCounting, getWelcome } from "@database/repositories/settingsRepository";
import { guildTallies } from "@database/repositories/usageRepository";
import { controlState, pause, resume } from "@lib/botControl.util";
import { botIdentity, forgetBotIdentity } from "@lib/botIdentity.util";
import { normaliseSettings } from "@lib/levelling.util";
import { botIdentityPatch, gatewayAction, guildIdParam, type OwnerGuildDetail, shutdownRequest } from "@testify/shared";

/**
 * What the bot owner can do to the running bot. Everything here is behind `requireOwner`.
 *
 * There is deliberately no "start": the HTTP server this responds on lives inside the bot process, so a stopped
 * bot has nothing left to serve the request. Pausing is the reversible half, and shutting down says plainly
 * that only the host can bring it back.
 */

export const control = new Hono<ApiBindings>();

control.use("*", requireOwner);

control.get("/", (context) => context.json(controlState(context.get("client"))));

control.post("/gateway", async (context) => {
	const client = context.get("client");
	const { action } = await parseBody(context, gatewayAction);
	const state = action === "pause" ? pause(client) : resume(client);

	await auditChange(context, {
		action: `bot.${action}`,
		summary: action === "pause" ? "Paused Testify" : "Resumed Testify",
		after: { gateway: state.gateway },
	});

	return context.json(state);
});

/**
 * Ends the process, and with it this API. Answered before exiting so the browser is told rather than left with
 * a dropped connection, and the exit is deferred a tick for the same reason.
 */
control.post("/shutdown", async (context) => {
	const client = context.get("client");
	await parseBody(context, shutdownRequest);

	await auditChange(context, {
		action: "bot.shutdown",
		summary: "Shut Testify down from the dashboard",
		after: { gateway: "stopped" },
	});

	client.logger.warn("[CONTROL] Shutting down at the request of the dashboard. Only the host can start it again.");
	setTimeout(() => void shutdown(client, "dashboard"), 100).unref();

	return context.json({ stopping: true });
});

control.patch("/identity", async (context) => {
	const client = context.get("client");
	const patch = await parseBody(context, botIdentityPatch);

	if (!client.isReady()) throw badRequest("Testify is still connecting. Try again in a moment.");

	try {
		if (patch.username !== undefined) await client.user.setUsername(patch.username);
		if (patch.avatar !== undefined) await client.user.setAvatar(patch.avatar);
	} catch (error) {
		// Discord rate-limits username changes hard, and the reason is the useful part of the answer.
		throw badRequest(error instanceof Error ? error.message : "Discord refused that change.");
	}

	// The cached profile is an hour old by design, and this is exactly the moment it is wrong.
	forgetBotIdentity();

	await auditChange(context, {
		action: "bot.identity",
		summary: patch.username === undefined ? "Changed the bot's avatar" : `Renamed the bot to ${patch.username}`,
		after: { username: patch.username ?? null, avatar: patch.avatar === undefined ? null : "changed" },
	});

	const identity = (await botIdentity(client))!;
	return context.json(identity);
});

control.get("/guilds/:guildId", async (context) => {
	const client = context.get("client");
	const { guildId } = parseParams(context, guildIdParam);
	const guild = client.guilds.cache.get(guildId);

	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	const [configured, tallies] = await Promise.all([configuredIn(guild), guildTallies(ANALYTICS.defaultWindowDays, 0)]);

	const me = guild.members.me;
	const body: OwnerGuildDetail = {
		id: guild.id,
		name: guild.name,
		iconUrl: guild.iconURL({ size: 128 }),
		memberCount: guild.memberCount,
		channelCount: guild.channels.cache.size,
		roleCount: guild.roles.cache.size,
		joinedAt: guild.joinedAt.toISOString(),
		createdAt: guild.createdAt.toISOString(),
		ownerId: guild.ownerId,
		nickname: me?.nickname ?? null,
		highestRole: me?.roles.highest.name ?? null,
		missingPermissions: missingIn(guild),
		configured,
		usage: tallies.find((row) => row.guildId === guild.id)?.count ?? 0,
	};

	return context.json(body);
});

/** The same four the fleet table counts, so a row and its detail cannot disagree. */
async function configuredIn(guild: Guild): Promise<string[]> {
	const [levels, audit, welcome, counting] = await Promise.all([
		getLevelSettings(guild.id),
		getAuditLogConfig(guild.id),
		getWelcome(guild.id),
		getCounting(guild.id),
	]);

	const found: string[] = [];
	if (normaliseSettings(levels).enabled) found.push("levelling");
	if (audit !== null && audit.enabledLogs.length > 0) found.push("audit logging");
	if (welcome !== null) found.push("welcome");
	if (counting !== null) found.push("counting");

	return found;
}

const WATCHED = [
	[PermissionFlagsBits.ManageRoles, "Manage Roles"],
	[PermissionFlagsBits.ManageMessages, "Manage Messages"],
	[PermissionFlagsBits.ViewAuditLog, "View Audit Log"],
	[PermissionFlagsBits.ManageChannels, "Manage Channels"],
	[PermissionFlagsBits.ChangeNickname, "Change Nickname"],
] as const;

function missingIn(guild: Guild): string[] {
	const me = guild.members.me;
	if (me === null) return [];

	return WATCHED.filter(([flag]) => !me.permissions.has(flag)).map(([, name]) => name);
}
