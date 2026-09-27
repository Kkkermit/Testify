import { type Context } from "hono";
import { type ApiBindings } from "@api/context";
import { toError } from "@core/errors";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";

/**
 * Written after the change succeeds; a failed audit write is logged and the request still succeeds. Keep `before` and
 * `after` to the field that changed.
 */
export async function auditChange(
	context: Context<ApiBindings>,
	entry: { action: string; summary: string; before?: unknown; after?: unknown },
): Promise<void> {
	const session = context.get("session");
	if (session === undefined) return;

	try {
		await recordAudit({
			actorId: session.userId,
			actorTag: session.username,
			guildId: context.get("guild")?.id ?? null,
			action: entry.action,
			summary: entry.summary,
			...(entry.before === undefined ? {} : { before: entry.before }),
			...(entry.after === undefined ? {} : { after: entry.after }),
		});
	} catch (error) {
		context.get("client").logger.error({ err: toError(error) }, "[API] Could not write a dashboard audit record");
	}
}
