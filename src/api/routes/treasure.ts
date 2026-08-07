import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { applyTreasure, readTreasure, resetTreasure } from "@lib/treasureActions.util";
import { treasurePatch } from "@testify/shared";

export const treasure = new Hono<ApiBindings>();

treasure.use("*", requireGuild);

function guildIdOf(context: Context<ApiBindings>): string {
	const guild = context.get("guild");
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	return guild.id;
}

function actorOf(context: Context<ApiBindings>): string {
	return context.get("session")?.userId ?? "";
}

treasure.get("/", async (context) => context.json(await readTreasure(guildIdOf(context))));

treasure.patch("/", async (context) => {
	const guildId = guildIdOf(context);
	const body = await parseBody(context, treasurePatch);

	const result = await applyTreasure(guildId, body, actorOf(context));
	if ("problem" in result) throw badRequest(result.problem);

	await auditChange(context, { action: "treasure.update", summary: summaryOf(body) });

	return context.json(result.settings);
});

treasure.post("/reset", async (context) => {
	const guildId = guildIdOf(context);

	const settings = await resetTreasure(guildId, actorOf(context));
	await auditChange(context, { action: "treasure.reset", summary: "Reset the treasure settings to their defaults" });

	return context.json(settings);
});

function summaryOf(patch: Record<string, unknown>): string {
	if ("enabled" in patch) return patch.enabled === true ? "Turned treasure drops on" : "Turned treasure drops off";

	return `Changed the treasure ${Object.keys(patch).join(", ")}`;
}
