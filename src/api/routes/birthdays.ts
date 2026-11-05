import { Hono } from "hono";
import { auditSettings } from "@api/audit";
import { type ApiBindings, guildOf } from "@api/context";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { applyBirthdaySettings, readBirthdayOverview } from "@lib/birthdays";
import { type BirthdayPatch, birthdayPatch } from "@testify/shared";

export const birthdays = new Hono<ApiBindings>();

birthdays.use("*", requireGuild);

function summarise(patch: BirthdayPatch): string {
	const parts: string[] = [];
	if (patch.enabled !== undefined) parts.push(patch.enabled ? "Turned birthday posts on" : "Turned birthday posts off");
	if (patch.channelId !== undefined) parts.push("Moved birthday posts");
	if (patch.message !== undefined) parts.push("Edited the birthday message");
	return parts.join(", ");
}

birthdays.get("/", async (context) => context.json(await readBirthdayOverview(guildOf(context))));

birthdays.patch("/", async (context) => {
	const guild = guildOf(context);
	const patch = await parseBody(context, birthdayPatch);
	const before = await readBirthdayOverview(guild);

	await applyBirthdaySettings(guild, patch, context.get("session")?.userId ?? null);
	const after = await readBirthdayOverview(guild);
	await auditSettings(context, { action: "birthdays.update", summary: summarise(patch), before, after });

	return context.json(after);
});
