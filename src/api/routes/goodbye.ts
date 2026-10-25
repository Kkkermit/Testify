import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, guildOf } from "@api/context";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { applyGoodbye, readGoodbye } from "@lib/welcome";
import { type GoodbyePatch, goodbyePatch } from "@testify/shared";

export const goodbye = new Hono<ApiBindings>();

goodbye.use("*", requireGuild);

/** Read on the overview's recent-changes card, so it has to say what changed without opening the diff. */
function summarise(patch: GoodbyePatch): string {
	const parts: string[] = [];
	if (patch.enabled !== undefined) parts.push(patch.enabled ? "Turned goodbyes on" : "Turned goodbyes off");
	if (patch.channelId !== undefined) parts.push("Moved the goodbye");
	if (patch.message !== undefined) parts.push("Edited the goodbye");
	if (patch.style !== undefined) parts.push(`Goodbye sent as ${patch.style === "embed" ? "an embed" : "a message"}`);
	return parts.join(", ");
}

goodbye.get("/", async (context) => context.json(await readGoodbye(guildOf(context))));

goodbye.patch("/", async (context) => {
	const guild = guildOf(context);
	const patch = await parseBody(context, goodbyePatch);

	const settings = await applyGoodbye(guild, patch, context.get("session")?.userId ?? null);
	await auditChange(context, { action: "goodbye.update", summary: summarise(patch) });

	return context.json(settings);
});
