import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { disableAuditLog, getAuditLogConfig, setAuditLogConfig } from "@database/repositories/settingsRepository";
import {
	AUDIT_EVENTS,
	type AuditLogConfigResponse,
	type AuditLogPut,
	auditLogPutSchema,
	collapseEnabled,
	resolveEnabled,
} from "@testify/shared";

type ApiContext = Context<ApiBindings>;

export const auditLog = new Hono<ApiBindings>();

auditLog.use("*", requireGuild);

function guildIdOf(context: ApiContext): string {
	const guild = context.get("guild");
	// `requireGuild` sets this before any handler runs; reaching here without it is a wiring mistake.
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	return guild.id;
}

/** No record is how the bot stores "off", so it becomes a disabled config a form can still render. */
async function configOf(guildId: string): Promise<AuditLogConfigResponse> {
	const stored = await getAuditLogConfig(guildId);

	if (stored === null) return { enabled: false, channelId: null, events: [...AUDIT_EVENTS], all: true };

	return {
		enabled: true,
		channelId: stored.channelId,
		events: resolveEnabled(stored.enabledLogs),
		all: stored.enabledLogs.includes("all"),
	};
}

auditLog.get("/", async (context) => context.json(await configOf(guildIdOf(context))));

auditLog.put("/", async (context) => {
	const guildId = guildIdOf(context);
	const next = await parseBody(context, auditLogPutSchema);
	const before = await configOf(guildId);

	if (next.enabled) {
		// There is nowhere to post without one, and the stored record requires it.
		if (next.channelId === null) throw badRequest("Choose a channel for the log before turning it on.");

		await setAuditLogConfig(guildId, next.channelId, collapseEnabled(next.events));
	} else {
		await disableAuditLog(guildId);
	}

	const after = await configOf(guildId);
	await auditChange(context, {
		action: "audit-log.update",
		summary: summarise(before, next),
		before: { enabled: before.enabled, channelId: before.channelId, events: before.events.length },
		after: { enabled: after.enabled, channelId: after.channelId, events: after.events.length },
	});

	return context.json(after);
});

/** Read on the overview's recent-changes card, so it has to say what changed without opening the diff. */
function summarise(before: AuditLogConfigResponse, next: AuditLogPut): string {
	if (!next.enabled) return "Turned audit logging off";
	if (!before.enabled) return "Turned audit logging on";

	const parts: string[] = [];
	if (before.channelId !== next.channelId) parts.push("Moved the log channel");
	if (before.events.length !== next.events.length) parts.push(`Now logging ${String(next.events.length)} events`);

	return parts.length === 0 ? "Changed the audit log settings" : parts.join(", ");
}
