import { type Guild } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { notInGuild } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseParams } from "@api/validate";
import { readSetupChecklist, runSetupStep, type SetupActor } from "@lib/settings";
import { type SetupStep, setupStepParams } from "@testify/shared";

type ApiContext = Context<ApiBindings>;

export const setup = new Hono<ApiBindings>();

setup.use("*", requireGuild);

function scopeOf(context: ApiContext): { guild: Guild; actor: SetupActor } {
	const guild = context.get("guild");
	// `requireGuild` sets this before any handler runs; reaching here without it is a wiring mistake.
	if (guild === undefined) throw notInGuild();

	return { guild, actor: { member: context.get("member"), isOwner: context.get("isOwner") === true } };
}

const SUMMARY: Record<SetupStep, string> = {
	levelling: "Turned levelling on from the setup checklist",
	welcome: "Turned welcome messages on from the setup checklist",
	"audit-log": "Turned audit logging on from the setup checklist",
};

setup.get("/", async (context) => {
	const { guild, actor } = scopeOf(context);
	return context.json(await readSetupChecklist(guild, actor));
});

setup.post("/:step", async (context) => {
	const { guild, actor } = scopeOf(context);
	const { step } = parseParams(context, setupStepParams);

	const { checklist, channelId } = await runSetupStep(guild, actor, step);
	await auditChange(context, {
		action: `setup.${step}`,
		summary: SUMMARY[step],
		before: { enabled: false },
		after: { enabled: true, ...(channelId === null ? {} : { channelId }) },
	});

	return context.json(checklist);
});
