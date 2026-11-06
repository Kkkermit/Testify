import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, guildIdOf } from "@api/context";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { getTuning, saveTuning } from "@database/repositories/tuningRepository";
import { tuningPatch } from "@testify/shared";

/** A server's pay, starting money, robbing and XP rates, the same record `/economy settings` changes. */
export const guildTuning = new Hono<ApiBindings>();

guildTuning.use("*", requireGuild);

guildTuning.get("/", async (context) => context.json(await getTuning(guildIdOf(context))));

guildTuning.patch("/", async (context) => {
	const patch = await parseBody(context, tuningPatch);
	const before = await getTuning(guildIdOf(context));

	const tuning = await saveTuning(guildIdOf(context), patch, context.get("session")?.userId ?? null);
	await auditChange(context, {
		action: "tuning.update",
		summary: "Changed the economy and XP rates",
		before,
		after: tuning,
	});

	return context.json(tuning);
});
