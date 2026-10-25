import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, guildIdOf } from "@api/context";
import { badRequest } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { applyCasinoSettings, CASINO_GAME_LABELS, readCasinoSettings } from "@lib/casino";
import { type CasinoPatch, casinoPatch, isCasinoGame } from "@testify/shared";

export const casino = new Hono<ApiBindings>();

casino.use("*", requireGuild);

casino.get("/", async (context) => context.json(await readCasinoSettings(guildIdOf(context))));

casino.patch("/", async (context) => {
	const guildId = guildIdOf(context);
	const body = (await parseBody(context, casinoPatch)) as CasinoPatch;

	const result = await applyCasinoSettings(guildId, body, context.get("session")?.userId ?? null);
	if ("problem" in result) throw badRequest(result.problem);

	await auditChange(context, { action: "casino.update", summary: summaryOf(body) });

	return context.json(result.settings);
});

function summaryOf(patch: CasinoPatch): string {
	if (patch.enabled !== undefined) return patch.enabled ? "Opened the casino" : "Closed the casino";

	const games = Object.entries(patch.games ?? {}).filter(([game]) => isCasinoGame(game));
	if (games.length > 0) {
		return games
			.map(
				([game, on]) =>
					`${on === true ? "Opened" : "Closed"} ${CASINO_GAME_LABELS[game as keyof typeof CASINO_GAME_LABELS]}`,
			)
			.join(", ");
	}

	return "Changed the casino's bet limits";
}
