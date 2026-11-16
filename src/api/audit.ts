import { type Context } from "hono";
import { type ApiBindings } from "@api/context";
import { toError } from "@core/errors";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { recordEvent } from "@lib/bot";
import {
	CHANGE_WAY_HEADER,
	type ChangeWay,
	isScreenRoute,
	type RestorableAction,
	restorableFields,
} from "@testify/shared";

/**
 * Written after the change succeeds; a failed audit write is logged and the request still succeeds. Keep `before` and
 * `after` to the field that changed.
 */
export async function auditChange<Action extends string>(
	context: Context<ApiBindings>,
	// A change that can be put back goes through `auditSettings`, so it cannot be recorded without what it replaced.
	entry: {
		action: Action extends RestorableAction ? never : Action;
		summary: string;
		before?: unknown;
		after?: unknown;
	},
): Promise<void> {
	await write(context, entry);
}

export async function auditSettings(
	context: Context<ApiBindings>,
	entry: { action: RestorableAction; summary: string; before: unknown; after: unknown },
): Promise<void> {
	await write(context, {
		action: entry.action,
		summary: entry.summary,
		before: restorableFields(entry.action, entry.before),
		after: restorableFields(entry.action, entry.after),
	});
}

async function write(
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

	countChange(context, entry.action);
}

/** Routes written to from a screen named otherwise, by the first part of their path after the server. */
const WRITTEN_FROM: Record<string, string> = {
	goodbye: "welcome",
	"shop-roles": "economy",
	tuning: "economy",
	verification: "settings",
	setup: "",
};

/** Not changes to a server: a test post sends something, and the backup page's program check blocks an account. */
const NOT_CHANGES = new Set(["test.send", "blacklist.add"]);

/** The screen a server's write came from, as a route pattern, so a change is counted without naming the server. */
export function changedScreen(path: string): string | null {
	const match = /^\/api\/guilds\/\d{17,20}(?:\/([a-z-]+))?/.exec(path);
	if (match === null) return null;

	const part = match[1] ?? "";
	const screen = WRITTEN_FROM[part] ?? part;
	const route = screen === "" ? "/guilds/:guildId" : `/guilds/:guildId/${screen}`;
	return isScreenRoute(route) ? route : null;
}

/** How the change was made, from the page's own header; a write without it, or with anything else, is a save. */
function wayOf(context: Context<ApiBindings>, action: string): ChangeWay {
	if (action.startsWith("setup.")) return "setup";
	const via = context.req.header(CHANGE_WAY_HEADER);
	return via === "put_back" || via === "backup" ? via : "save";
}

function countChange(context: Context<ApiBindings>, action: string): void {
	const guild = context.get("guild");
	if (guild === undefined || NOT_CHANGES.has(action)) return;

	const screen = changedScreen(context.req.path);
	if (screen === null) return;

	recordEvent(context.get("client"), "dashboard_change", { screen, how: wayOf(context, action) }, guild.id);
}
