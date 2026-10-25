import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, guildIdOf } from "@api/context";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { applyMusicSettings, readMusicSettings } from "@lib/music";
import { musicPatch } from "@testify/shared";

export const music = new Hono<ApiBindings>();

music.use("*", requireGuild);

music.get("/", async (context) => context.json(await readMusicSettings(guildIdOf(context))));

music.patch("/", async (context) => {
	const guildId = guildIdOf(context);
	const body = await parseBody(context, musicPatch);

	const settings = await applyMusicSettings(guildId, body, context.get("session")?.userId ?? null);
	await auditChange(context, { action: "music.update", summary: summaryOf(body) });

	return context.json(settings);
});

function summaryOf(patch: Record<string, unknown>): string {
	if ("enabled" in patch) return patch.enabled === true ? "Turned the music system on" : "Turned the music system off";

	return "Changed which roles may use the music system";
}
