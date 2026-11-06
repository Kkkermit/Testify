import { PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, guildOf } from "@api/context";
import { unauthorised } from "@api/errors";
import { requirePermission } from "@api/middleware/reach";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams, parseQuery } from "@api/validate";
import { listAppeals } from "@database/repositories/appealRepository";
import { applyAppealSettings, decideOnAppeal, readAppealSettings, toAppealRow } from "@lib/appeals";
import {
	appealDecision,
	appealListQuery,
	appealParams,
	type AppealRow,
	appealSettingsPatch,
	type Paged,
} from "@testify/shared";

/** Staff's side of ban appeals; reading or deciding one asks Ban Members, as lifting a ban in Discord does. */
export const guildAppeals = new Hono<ApiBindings>();

guildAppeals.use("*", requireGuild);

guildAppeals.get("/settings", async (context) =>
	context.json(await readAppealSettings(context.get("client"), guildOf(context))),
);

guildAppeals.patch("/settings", async (context) => {
	const guild = guildOf(context);
	const patch = await parseBody(context, appealSettingsPatch);

	const settings = await applyAppealSettings(
		context.get("client"),
		guild,
		patch,
		context.get("session")?.userId ?? null,
	);
	await auditChange(context, {
		action: "appeals.update",
		summary:
			patch.enabled === undefined ? "Changed the ban appeals" : `Turned ban appeals ${patch.enabled ? "on" : "off"}`,
		after: settings,
	});

	return context.json(settings);
});

guildAppeals.get("/", requirePermission(PermissionFlagsBits.BanMembers), async (context) => {
	const { status, page, perPage } = parseQuery(context, appealListQuery);

	const { items, total } = await listAppeals(guildOf(context).id, status, {
		skip: (page - 1) * perPage,
		limit: perPage,
	});
	const body: Paged<AppealRow> = { items: items.map(toAppealRow), total, page, perPage };

	return context.json(body);
});

guildAppeals.post("/:appealId/decision", requirePermission(PermissionFlagsBits.BanMembers), async (context) => {
	const guild = guildOf(context);
	const { appealId } = parseParams(context, appealParams);
	const decision = await parseBody(context, appealDecision);
	const session = context.get("session");
	if (session === undefined) throw unauthorised();

	const decided = await decideOnAppeal(context.get("client"), guild, appealId, decision, {
		id: session.userId,
		username: session.username,
	});
	await auditChange(context, {
		action: decided.status === "accepted" ? "appeals.accept" : "appeals.refuse",
		summary: `${decided.status === "accepted" ? "Accepted" : "Refused"} ${decided.username}'s ban appeal`,
	});

	return context.json(toAppealRow(decided));
});
