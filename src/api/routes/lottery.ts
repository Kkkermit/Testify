import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { deleteLottery } from "@database/repositories/lotteryRepository";
import { applyLottery, normaliseLottery, readLottery } from "@lib/lotteryActions.util";
import { lotteryPatch } from "@testify/shared";

export const lottery = new Hono<ApiBindings>();

lottery.use("*", requireGuild);

function guildIdOf(context: Context<ApiBindings>): string {
	const guild = context.get("guild");
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	return guild.id;
}

lottery.get("/", async (context) => context.json(await readLottery(guildIdOf(context))));

lottery.patch("/", async (context) => {
	const guildId = guildIdOf(context);
	const body = await parseBody(context, lotteryPatch);

	const result = await applyLottery(guildId, body, context.get("session")?.userId ?? "");
	if ("problem" in result) throw badRequest(result.problem);

	await auditChange(context, { action: "lottery.update", summary: summaryOf(body) });

	return context.json(result.settings);
});

/** The pot goes with it, so this is the one control on the page that needs a confirmation in front of it. */
lottery.delete("/", async (context) => {
	const guildId = guildIdOf(context);

	if (!(await deleteLottery(guildId))) throw notFound("lottery_not_found", "No lottery is running here.");
	await auditChange(context, { action: "lottery.delete", summary: "Ended the lottery and cleared the pot" });

	return context.json(normaliseLottery(null));
});

function summaryOf(patch: Record<string, unknown>): string {
	if ("frozen" in patch) return patch.frozen === true ? "Froze the lottery" : "Unfroze the lottery";

	return `Changed the lottery ${Object.keys(patch).join(", ")}`;
}
