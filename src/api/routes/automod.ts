import { type AutoModerationRule, type Guild } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, guildOf } from "@api/context";
import { ApiProblem, badRequest, notFound, UpstreamProblem } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { botName } from "@core/brand";
import { canManageAutomod, changeRule, createAutomodRule, listAutomodRules, type RuleChange } from "@lib/moderation";
import { type AutomodRules, automodCreate, automodPatch, automodRuleParam } from "@testify/shared";

export const automod = new Hono<ApiBindings>();

automod.use("*", requireGuild);

/** Without Manage Server the fetch throws, so the page is told rather than shown a broken list. */
async function rulesFor(guild: Guild, botId: string): Promise<AutomodRules> {
	if (!canManageAutomod(guild)) return { rules: [], canManage: false };

	return { rules: await listAutomodRules(guild, botId), canManage: true };
}

function botIdOf(context: Context<ApiBindings>): string {
	return context.get("client").user?.id ?? "";
}

automod.get("/", async (context) => context.json(await rulesFor(guildOf(context), botIdOf(context))));

automod.post("/", async (context) => {
	const guild = guildOf(context);
	if (!canManageAutomod(guild)) throw badRequest(`${botName()} needs the Manage Server permission to add a rule.`);

	const body = await parseBody(context, automodCreate);
	const session = context.get("session");

	const rule = await createAutomodRule(guild, body, `Added from the dashboard by ${session?.username ?? "an admin"}`);
	await auditChange(context, { action: "automod.create", summary: `Added the AutoMod rule ${rule.name}` });

	return context.json(await rulesFor(guild, botIdOf(context)));
});

automod.patch("/:ruleId", async (context) => {
	const guild = guildOf(context);
	const { ruleId } = parseParams(context, automodRuleParam);
	const { enabled } = await parseBody(context, automodPatch);

	const rule = await ruleIn(guild, ruleId, botName());
	const change = await changeRule(() => rule.setEnabled(enabled, "Changed from the dashboard"));
	if (change.outcome === "gone") throw ruleGone();
	answerFor(context, rule, change, "change");

	await auditChange(context, {
		action: "automod.update",
		summary: `${enabled ? "Enabled" : "Disabled"} the AutoMod rule ${rule.name}`,
	});

	return context.json(await rulesFor(guild, botIdOf(context)));
});

automod.delete("/:ruleId", async (context) => {
	const guild = guildOf(context);
	const { ruleId } = parseParams(context, automodRuleParam);

	const rule = await ruleIn(guild, ruleId, botName());
	const change = await changeRule(() => rule.delete("Removed from the dashboard"));
	answerFor(context, rule, change, "remove");

	// A rule already gone is what removing it asked for, so the fresh list is the answer either way.
	if (change.outcome === "done") {
		await auditChange(context, { action: "automod.delete", summary: `Removed the AutoMod rule ${rule.name}` });
	}

	return context.json(await rulesFor(guild, botIdOf(context)));
});

const ruleGone = (): ApiProblem => notFound("rule_not_found", "There is no AutoMod rule with that id in this server.");

/** A refusal keeps Discord's code in the log, where the host can read it, and tells the reader where else to try. */
function answerFor(
	context: Context<ApiBindings>,
	rule: AutoModerationRule,
	change: RuleChange,
	verb: "change" | "remove",
): void {
	if (change.outcome === "unavailable")
		throw new UpstreamProblem(change.status, "Discord did not answer. Try again shortly.");
	if (change.outcome !== "refused") return;

	context.get("client").logger.warn(
		{
			discordMessage: change.message,
			guildId: rule.guild.id,
			ruleId: rule.id,
			creatorId: rule.creatorId,
			status: change.status,
			code: change.code,
		},
		`[AUTOMOD] Discord refused to ${verb} an AutoMod rule. Its code says why; the rule can still be changed in Discord.`,
	);
	throw new ApiProblem(
		409,
		"automod_refused",
		`Discord would not let ${botName()} ${verb} that rule. ${verb === "remove" ? "Remove" : "Change"} it in Discord under Server Settings → AutoMod instead.`,
	);
}

async function ruleIn(guild: Guild, ruleId: string, bot: string): Promise<AutoModerationRule> {
	if (!canManageAutomod(guild)) throw badRequest(`${bot} needs the Manage Server permission to change a rule.`);

	const rule = await guild.autoModerationRules.fetch(ruleId).catch(() => null);
	if (rule === null) throw notFound("rule_not_found", "There is no AutoMod rule with that id in this server.");

	return rule;
}
