import { type AutoModerationRule, type Guild } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { canManageAutomod, createAutomodRule, listAutomodRules } from "@lib/automodActions.util";
import { type AutomodRules, automodCreate, automodPatch, automodRuleParam } from "@testify/shared";

export const automod = new Hono<ApiBindings>();

automod.use("*", requireGuild);

function guildOf(context: Context<ApiBindings>): Guild {
	const guild = context.get("guild");
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	return guild;
}

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
	if (!canManageAutomod(guild)) throw badRequest("Testify needs the Manage Server permission to add a rule.");

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

	const rule = await ruleIn(guild, ruleId);
	await rule.setEnabled(enabled, "Changed from the dashboard");
	await auditChange(context, {
		action: "automod.update",
		summary: `${enabled ? "Enabled" : "Disabled"} the AutoMod rule ${rule.name}`,
	});

	return context.json(await rulesFor(guild, botIdOf(context)));
});

automod.delete("/:ruleId", async (context) => {
	const guild = guildOf(context);
	const { ruleId } = parseParams(context, automodRuleParam);

	const rule = await ruleIn(guild, ruleId);
	const name = rule.name;

	await rule.delete("Removed from the dashboard");
	await auditChange(context, { action: "automod.delete", summary: `Removed the AutoMod rule ${name}` });

	return context.json(await rulesFor(guild, botIdOf(context)));
});

async function ruleIn(guild: Guild, ruleId: string): Promise<AutoModerationRule> {
	if (!canManageAutomod(guild)) throw badRequest("Testify needs the Manage Server permission to change a rule.");

	const rule = await guild.autoModerationRules.fetch(ruleId).catch(() => null);
	if (rule === null) throw notFound("rule_not_found", "There is no AutoMod rule with that id in this server.");

	return rule;
}
