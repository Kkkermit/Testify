import { Hono } from "hono";
import { auditChange, auditSettings } from "@api/audit";
import { type ApiBindings, guildIdOf } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { deleteLottery } from "@database/repositories/lotteryRepository";
import { applyLottery, normaliseLottery, readLottery } from "@lib/economy";
import { lotteryPatch } from "@testify/shared";

export const lottery = new Hono<ApiBindings>();

lottery.use("*", requireGuild);

lottery.get("/", async (context) => context.json(await readLottery(guildIdOf(context))));

lottery.patch("/", async (context) => {
	const guildId = guildIdOf(context);
	const body = await parseBody(context, lotteryPatch);
	const before = await readLottery(guildId);

	const result = await applyLottery(guildId, body, context.get("session")?.userId ?? "");
	if ("problem" in result) throw badRequest(result.problem);

	await auditSettings(context, { action: "lottery.update", summary: summaryOf(body), before, after: result.settings });

	return context.json(result.settings);
});

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
