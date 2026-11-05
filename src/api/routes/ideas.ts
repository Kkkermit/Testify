import { Hono } from "hono";
import { auditChange, auditSettings } from "@api/audit";
import { type ApiBindings, guildOf } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams, parseQuery } from "@api/validate";
import { listIdeas } from "@database/repositories/ideaRepository";
import { applyIdeaSettings, decideOnIdea, readIdeaSettings, removeIdea, toIdeaRow } from "@lib/ideas";
import { ideaDecision, ideaListQuery, ideaParams, type IdeaRow, ideaSettingsPatch, type Paged } from "@testify/shared";

export const ideas = new Hono<ApiBindings>();

ideas.use("*", requireGuild);

ideas.get("/", async (context) => context.json(await readIdeaSettings(guildOf(context))));

ideas.patch("/", async (context) => {
	const guild = guildOf(context);
	const patch = await parseBody(context, ideaSettingsPatch);
	const before = await readIdeaSettings(guild);

	const settings = await applyIdeaSettings(guild, patch, context.get("session")?.userId ?? null);
	await auditSettings(context, {
		action: "ideas.update",
		before,
		after: settings,
		summary:
			patch.enabled === undefined ? "Moved the idea board" : `Turned the idea board ${patch.enabled ? "on" : "off"}`,
	});

	return context.json(settings);
});

ideas.get("/list", async (context) => {
	const guild = guildOf(context);
	const { status, page, perPage } = parseQuery(context, ideaListQuery);

	const { items, total } = await listIdeas(guild.id, status, { skip: (page - 1) * perPage, limit: perPage });
	const body: Paged<IdeaRow> = { items: items.map(toIdeaRow), total, page, perPage };

	return context.json(body);
});

ideas.post("/:ideaId/decision", async (context) => {
	const guild = guildOf(context);
	const { ideaId } = parseParams(context, ideaParams);
	const decision = await parseBody(context, ideaDecision);
	const session = context.get("session");
	if (session === undefined) throw badRequest("Sign in again to decide on an idea.");

	const decided = await decideOnIdea(context.get("client"), guild, ideaId, decision, {
		id: session.userId,
		name: session.username,
	});
	await auditChange(context, {
		action: "ideas.decide",
		summary: `Marked idea #${String(decided.number)} as ${decided.status}`,
	});

	return context.json(toIdeaRow(decided));
});

ideas.delete("/:ideaId", async (context) => {
	const guild = guildOf(context);
	const { ideaId } = parseParams(context, ideaParams);

	const removed = await removeIdea(guild, ideaId);
	if (removed === null) throw notFound("idea_not_found", "There is no idea with that id in this server.");
	await auditChange(context, { action: "ideas.delete", summary: `Deleted idea #${String(removed.number)}` });

	return context.body(null, 204);
});
