import { type Guild, type User } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { SETTING_READERS } from "@lib/settings/settingsReaders.util";
import { RESTORABLE, type RestorableAction, restorableFields, sameValue } from "@testify/shared";

/** Settings changed with a command or a panel in Discord, recorded beside the dashboard's own so Changes is whole. */

type Fields<Action extends RestorableAction> = (typeof RESTORABLE)[Action]["fields"][number];

/** A switch is worded as one; every other field is named in a list of what changed. */
const SWITCHES = {
	enabled: (on: boolean, noun: string) => `Turned ${noun} ${on ? "on" : "off"}`,
	frozen: (on: boolean, noun: string) => `${on ? "Froze" : "Unfroze"} ${noun}`,
} as const;

type Labelled<Action extends RestorableAction> = Exclude<Fields<Action>, keyof typeof SWITCHES>;

const WORDS: { [Action in RestorableAction]: { noun: string; fields: Record<Labelled<Action>, string> } } = {
	"welcome.update": {
		noun: "welcome messages",
		fields: { channelId: "channel", message: "message", style: "style" },
	},
	"goodbye.update": {
		noun: "goodbye messages",
		fields: { channelId: "channel", message: "message", style: "style" },
	},
	"birthdays.update": { noun: "birthday posts", fields: { channelId: "channel", message: "message" } },
	"levelling.update": {
		noun: "levelling",
		fields: { announce: "announcements", stackRewards: "reward stacking", levelUpChannelId: "level-up channel" },
	},
	"starboard.update": {
		noun: "the starboard",
		fields: { channelId: "channel", threshold: "stars needed", selfStar: "own stars" },
	},
	"ideas.update": { noun: "the idea board", fields: { channelId: "channel" } },
	"temp-voice.update": {
		noun: "join to create",
		fields: {
			lobbyChannelId: "lobby",
			categoryId: "category",
			nameTemplate: "channel name",
			userLimit: "people per channel",
		},
	},
	"raid.update": {
		noun: "raid protection",
		fields: {
			alertChannelId: "alert channel",
			pingRoleId: "role pinged",
			minAccountAgeDays: "minimum account age",
			spikeJoins: "joins for a spike",
			spikeMinutes: "minutes for a spike",
		},
	},
	"cases.settings": { noun: "moderation cases", fields: { logChannelId: "log channel" } },
	"verification.update": {
		noun: "verification",
		fields: { channelId: "channel", roleId: "role", message: "message" },
	},
	"music.update": { noun: "the music system", fields: { djRoleIds: "DJ roles" } },
	"treasure.update": {
		noun: "treasure drops",
		fields: {
			minMessages: "fewest messages",
			maxMessages: "most messages",
			minAmount: "smallest drop",
			maxAmount: "largest drop",
			cooldownMs: "cooldown",
		},
	},
	"lottery.update": {
		noun: "the lottery",
		fields: {
			entryFee: "ticket price",
			basePrizePool: "starting pot",
			maxWinners: "winners",
			frequency: "draw schedule",
			announcementChannelId: "announcement channel",
		},
	},
	"settings.prefix": { noun: "prefix commands", fields: { prefix: "prefix" } },
	"settings.anti-link": { noun: "link filtering", fields: { bypassPermission: "bypass permission" } },
	"settings.auto-roles": { noun: "roles on join", fields: { roleIds: "roles" } },
	"settings.counting": { noun: "counting", fields: { channelId: "channel", maxCount: "target" } },
	"settings.voice-stats": {
		noun: "member count channels",
		fields: { memberChannelId: "member channel", botChannelId: "bot channel" },
	},
};

function capitalise(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

function listed(words: string[]): string {
	return words.length <= 1 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} and ${words.at(-1) ?? ""}`;
}

/** What changed between two readings of a setting, as one line; null when nothing did. */
export function describeChange(
	action: RestorableAction,
	before: Record<string, unknown>,
	after: Record<string, unknown>,
): string | null {
	const words: { noun: string; fields: Partial<Record<string, string>> } = WORDS[action];
	const fields: readonly string[] = RESTORABLE[action].fields;
	const changed = fields.filter(
		(field) => Object.hasOwn(before, field) && Object.hasOwn(after, field) && !sameValue(before[field], after[field]),
	);
	if (changed.length === 0) return null;

	const parts: string[] = [];
	for (const [field, phrase] of Object.entries(SWITCHES)) {
		if (changed.includes(field)) parts.push(phrase(after[field] === true, words.noun));
	}

	const named = changed.filter((field) => !Object.hasOwn(SWITCHES, field)).map((field) => words.fields[field] ?? field);
	if (named.length > 0)
		parts.push(`${parts.length > 0 ? "changed" : "Changed"} the ${listed(named)} for ${words.noun}`);

	return capitalise(parts.join(", "));
}

interface Acting {
	guild: Guild | null;
	user: User;
}

async function readEach(guild: Guild, actions: readonly RestorableAction[]): Promise<unknown[]> {
	return Promise.all(
		actions.map(async (action) => {
			try {
				return await SETTING_READERS[action](guild);
			} catch {
				return undefined;
			}
		}),
	);
}

/**
 * Wraps a command's or a panel's `run` so a setting it changes is recorded as the dashboard records its own, with the
 * person who pressed as the actor. A reading that fails, or a change that did not happen, records nothing.
 */
export function recordingChanges<Interaction extends Acting, Rest extends unknown[]>(
	actions: readonly RestorableAction[],
	run: (interaction: Interaction, ...rest: Rest) => Promise<void>,
): (interaction: Interaction, ...rest: Rest) => Promise<void> {
	return async (interaction, ...rest) => {
		const guild = interaction.guild;
		if (guild === null) return run(interaction, ...rest);

		const before = await readEach(guild, actions);
		try {
			await run(interaction, ...rest);
		} finally {
			await recordAfter(guild, interaction.user, actions, before);
		}
	};
}

type AnyRun = (interaction: Acting, ...rest: unknown[]) => Promise<void>;

interface Runs {
	run?: unknown;
	subcommands?: readonly unknown[];
}

function wrapRuns<Definition>(actions: readonly RestorableAction[], definition: Definition): Definition {
	const runs = definition as Runs;
	const wrapped: Runs = { ...runs };
	if (typeof runs.run === "function") wrapped.run = recordingChanges(actions, (runs.run as AnyRun).bind(definition));
	if (runs.subcommands !== undefined) wrapped.subcommands = runs.subcommands.map((sub) => wrapRuns(actions, sub));
	return wrapped as Definition;
}

/** The same, for a whole button handler or command and each of its subcommands: `recordsSettings([...], defineButton({...}))`. */
export function recordsSettings<Definition extends object>(
	actions: readonly RestorableAction[],
	definition: Definition,
): Definition {
	return wrapRuns(actions, definition);
}

async function recordAfter(
	guild: Guild,
	user: User,
	actions: readonly RestorableAction[],
	before: unknown[],
): Promise<void> {
	try {
		const after = await readEach(guild, actions);
		await Promise.all(
			actions.map(async (action, index) => {
				if (before[index] === undefined || after[index] === undefined) return;

				const was = restorableFields(action, before[index]);
				const now = restorableFields(action, after[index]);
				const summary = describeChange(action, was, now);
				if (summary === null) return;

				await recordAudit({
					actorId: user.id,
					actorTag: user.username,
					guildId: guild.id,
					action,
					summary,
					before: was,
					after: now,
					source: "command",
				});
			}),
		);
	} catch (error) {
		(guild.client as TestifyClient).logger.error(
			{ err: toError(error), guildId: guild.id },
			"[SETTINGS] A change made in Discord could not be recorded. The change itself went through.",
		);
	}
}
