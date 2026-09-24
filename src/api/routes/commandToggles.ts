import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { notInGuild } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import {
	disabledGlobally,
	disabledInGuild,
	GLOBAL_SCOPE,
	setDisabled,
} from "@database/repositories/commandToggleRepository";
import { ALWAYS_ENABLED, type CommandToggleState, commandTogglePut } from "@testify/shared";

/** Which commands are switched off, per server or bot-wide; the bot-wide mount sits under `/owner`. */

type ApiContext = Context<ApiBindings>;

function guildIdOf(context: ApiContext): string {
	const guild = context.get("guild");
	// `requireGuild` sets this before any handler runs; reaching here without it is a wiring mistake.
	if (guild === undefined) throw notInGuild();

	return guild.id;
}

/** Owner-only names are filtered out on the way out and refused on the way in. */
function ordinary(context: ApiContext, names: string[]): string[] {
	const commands = context.get("client").commands;

	return names.filter((name) => commands.get(name)?.ownerOnly !== true);
}

export const guildCommandToggles = new Hono<ApiBindings>();

guildCommandToggles.use("*", requireGuild);

guildCommandToggles.get("/", async (context) => {
	const guildId = guildIdOf(context);
	const [disabled, globally] = await Promise.all([disabledInGuild(guildId), disabledGlobally()]);

	const body: CommandToggleState = {
		disabled: ordinary(context, disabled),
		disabledGlobally: ordinary(context, globally),
		locked: [...ALWAYS_ENABLED],
	};

	return context.json(body);
});

guildCommandToggles.put("/", async (context) => {
	const guildId = guildIdOf(context);
	const { disabled } = await parseBody(context, commandTogglePut);
	const session = context.get("session");

	const kept = ordinary(context, disabled);
	await setDisabled(guildId, kept, session?.userId ?? null);

	await auditChange(context, {
		action: "commands.toggle",
		summary:
			kept.length === 0
				? "Turned every command back on"
				: `Switched off ${String(kept.length)} commands in this server`,
		after: { disabled: kept },
	});

	const body: CommandToggleState = {
		disabled: kept,
		disabledGlobally: ordinary(context, await disabledGlobally()),
		locked: [...ALWAYS_ENABLED],
	};

	return context.json(body);
});

export const globalCommandToggles = new Hono<ApiBindings>();

globalCommandToggles.get("/", async (context) => {
	const body: CommandToggleState = {
		disabled: await disabledGlobally(),
		disabledGlobally: [],
		locked: [...ALWAYS_ENABLED],
	};

	return context.json(body);
});

globalCommandToggles.put("/", async (context) => {
	const { disabled } = await parseBody(context, commandTogglePut);
	const session = context.get("session");

	await setDisabled(GLOBAL_SCOPE, disabled, session?.userId ?? null);

	await auditChange(context, {
		action: "commands.toggle-global",
		summary:
			disabled.length === 0
				? "Turned every command back on everywhere"
				: `Switched off ${String(disabled.length)} commands everywhere`,
		after: { disabled },
	});

	const body: CommandToggleState = { disabled, disabledGlobally: [], locked: [...ALWAYS_ENABLED] };
	return context.json(body);
});
