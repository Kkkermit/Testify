import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, guildIdOf } from "@api/context";
import { notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { findAutoResponder } from "@database/repositories/autoResponderRepository";
import { addAutoResponder, editAutoResponder, readAutoResponders, removeAutoResponder } from "@lib/autoResponders";
import { autoResponderInput, autoResponderParams } from "@testify/shared";

export const autoResponders = new Hono<ApiBindings>();

autoResponders.use("*", requireGuild);

/** The trigger is typed text, so the audit line quotes only the start of it. */
const quoted = (trigger: string): string => `“${trigger.length > 60 ? `${trigger.slice(0, 59)}…` : trigger}”`;

async function existing(guildId: string, responderId: string): Promise<void> {
	if ((await findAutoResponder(guildId, responderId)) === null) {
		throw notFound("auto_responder_not_found", "That auto-responder has been deleted.");
	}
}

autoResponders.get("/", async (context) => context.json(await readAutoResponders(guildIdOf(context))));

/** Every write answers with the whole list, so the page shows what the server holds rather than what it sent. */
autoResponders.post("/", async (context) => {
	const guildId = guildIdOf(context);
	const body = await parseBody(context, autoResponderInput);

	const created = await addAutoResponder(guildId, body, context.get("session")?.userId ?? null);
	await auditChange(context, {
		action: "autoResponder.create",
		summary: `Auto-responder for ${quoted(created.trigger)}`,
	});

	return context.json(await readAutoResponders(guildId), 201);
});

autoResponders.put("/:responderId", async (context) => {
	const guildId = guildIdOf(context);
	const { responderId } = parseParams(context, autoResponderParams);
	await existing(guildId, responderId);
	const body = await parseBody(context, autoResponderInput);

	const saved = await editAutoResponder(guildId, responderId, body, context.get("session")?.userId ?? null);
	await auditChange(context, {
		action: "autoResponder.update",
		summary: `Edited the auto-responder for ${quoted(saved.trigger)}`,
	});

	return context.json(await readAutoResponders(guildId));
});

autoResponders.delete("/:responderId", async (context) => {
	const guildId = guildIdOf(context);
	const { responderId } = parseParams(context, autoResponderParams);
	await existing(guildId, responderId);

	await removeAutoResponder(guildId, responderId);
	await auditChange(context, { action: "autoResponder.delete", summary: "Deleted an auto-responder" });

	return context.json(await readAutoResponders(guildId));
});
