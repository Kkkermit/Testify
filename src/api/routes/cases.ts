import { PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, guildOf } from "@api/context";
import { requirePermission } from "@api/middleware/reach";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseQuery } from "@api/validate";
import { applyCaseSettings, readCases, readCaseSettings } from "@lib/moderation";
import { casePatch, caseQuery } from "@testify/shared";

export const cases = new Hono<ApiBindings>();

cases.use("*", requireGuild);

/** Registered before any route with a parameter, so "settings" is never read as one. */
cases.get("/settings", async (context) => context.json(await readCaseSettings(guildOf(context))));

cases.put("/settings", async (context) => {
	const guild = guildOf(context);
	const { logChannelId } = await parseBody(context, casePatch);

	const settings = await applyCaseSettings(guild, logChannelId, context.get("session")?.userId ?? null);
	await auditChange(context, {
		action: "cases.settings",
		summary:
			logChannelId === null ? "Stopped posting moderation cases" : `Moderation cases posted in <#${logChannelId}>`,
	});

	return context.json(settings);
});

cases.get("/", requirePermission(PermissionFlagsBits.ModerateMembers), async (context) => {
	const { page, q, action } = parseQuery(context, caseQuery);
	return context.json(
		await readCases(guildOf(context).id, { page, query: q, ...(action === undefined ? {} : { action }) }),
	);
});
