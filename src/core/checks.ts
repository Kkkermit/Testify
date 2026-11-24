import { PermissionFlagsBits, type PermissionResolvable, PermissionsBitField } from "discord.js";
import { type BotLanguage } from "@config/languages";
import { theme } from "@config/theme";
import { botName } from "@core/brand";
import { type TestifyClient } from "@core/client";
import { type Command, type CommandInput, type Subcommand, subcommandsOf } from "@core/command";
import { UserFacingError } from "@core/errors";
import { durationIn, eitherOf, permissionList, readerLanguage, say } from "@core/language";
import { findBlacklistEntry } from "@database/repositories/blacklistRepository";
import { disabledGlobally, disabledInGuild } from "@database/repositories/commandToggleRepository";
import { getMusicSettings } from "@database/repositories/musicSettingsRepository";
import { reportOwnerAttempt } from "@lib/bot/ownerAudit.util";
import { ownerContacts } from "@lib/bot/owners.util";
import { CASINO_COMMAND, CASINO_SETTINGS_SUBCOMMAND, CASINO_STATS_SUBCOMMAND } from "@lib/casino/casino.constants";
import { casinoRefusal, readCasinoSettings } from "@lib/casino/casinoSettings.util";
import { MUSIC_SYSTEM_SUBCOMMAND } from "@lib/music/music.constants";
import { musicRefusal, normaliseMusicSettings } from "@lib/music/musicSettings.util";
import { type CasinoGame, isAlwaysEnabled, isCasinoGame, type RefusalReason } from "@testify/shared";

interface TitledRefusal {
	title: string;
	message: string;
	fields?: { name: string; value: string }[];
	/** A refusal is a notice by default; `error` is for one that is final. */
	tone?: "notice" | "error";
}

type CheckFailure = string | TitledRefusal | null;

export function refusalText(refusal: string | TitledRefusal): string {
	if (typeof refusal === "string") return refusal;

	const fields = (refusal.fields ?? []).map((field) => `**${field.name}:** ${field.value}`);
	return [`**${refusal.title}**`, refusal.message, ...fields].join("\n");
}

export const OWNER_ONLY_REFUSAL = say("en", "ownerOnly");

const cooldowns = new Map<string, number>();

/** Deleting your own data is not something the blacklist takes away; the blacklist entry itself is never deleted. */
const OPEN_TO_THE_BLACKLISTED: ReadonlySet<string> = new Set(["delete-my-data"]);

export interface Refusal {
	failure: string | TitledRefusal;
	reason: RefusalReason;
}

export async function runChecks(
	interaction: CommandInput,
	command: Command,
	client: TestifyClient,
): Promise<CheckFailure> {
	return (await checkCommand(interaction, command, client))?.failure ?? null;
}

const refused = (reason: RefusalReason, failure: CheckFailure): Refusal | null =>
	failure === null ? null : { failure, reason };

export async function checkCommand(
	interaction: CommandInput,
	command: Command,
	client: TestifyClient,
): Promise<Refusal | null> {
	const language = readerLanguage(interaction);

	// First, so an attempt is recorded and refused whatever else would have stopped it.
	if (command.ownerOnly === true && !client.isOwner(interaction.user.id)) {
		await reportOwnerAttempt(client, interaction, command);
		return refused("owner_only", say(language, "ownerOnly"));
	}

	if (client.paused) return refused("paused", pausedRefusal(language));

	const blacklisted = await findBlacklistEntry(interaction.user.id);
	if (blacklisted && !OPEN_TO_THE_BLACKLISTED.has(command.name)) {
		return refused("blacklisted", blacklistRefusal(blacklisted, await ownerNames(client), language));
	}

	const switchedOff = await checkSwitchedOff(command.name, interaction.guildId, language);
	if (switchedOff !== null) return switchedOff;

	const subcommand = subcommandRun(interaction, command);
	if (subcommand === undefined) {
		const names = subcommandsOf(command).map((sub) => `\`${sub.name}\``);
		return refused("no_subcommand", say(language, "pickSubcommand", { subcommands: eitherOf(language, names) }));
	}

	const musicOff = await checkMusicSystem(interaction, command, subcommand);
	if (musicOff !== null) return refused("music", musicOff);

	const casinoClosed = await checkCasino(interaction, command, subcommand);
	if (casinoClosed !== null) return refused("casino", casinoClosed);

	if (command.guildOnly && !interaction.guild) {
		return refused("guild_only", say(language, "guildOnly"));
	}

	if (command.nsfw) {
		const channel = interaction.channel;
		const isNsfw = channel !== null && "nsfw" in channel && channel.nsfw;
		if (!isNsfw) return refused("nsfw_only", say(language, "nsfwOnly"));
	}

	const member = interaction.member;
	const needed = [...(command.permissions ?? []), ...(subcommand?.permissions ?? [])];

	if (needed.length > 0 && member !== null) {
		// The channel's overrides count, as they do in Discord, so a role's permission is not enough where it is taken away.
		const missing = (interaction.memberPermissions ?? permissionsOf(member)).missing(new PermissionsBitField(needed));
		if (missing.length > 0) {
			return refused("you_lack", lacking(language, "youNeed", missing));
		}
	}

	if (command.botPermissions?.length && interaction.guild?.members.me) {
		const missing = interaction.guild.members.me.permissions.missing(new PermissionsBitField(command.botPermissions));
		if (missing.length > 0) {
			return refused("bot_lacks", lacking(language, "iNeed", missing));
		}
	}

	return refused("cooldown", checkCooldown(interaction, command, client, language));
}

function lacking(language: BotLanguage, who: "youNeed" | "iNeed", missing: string[]): string {
	return say(language, who, { permissions: permissionList(language, missing) });
}

async function ownerNames(client: TestifyClient): Promise<string[]> {
	return (await ownerContacts(client)).map((owner) => owner.name);
}

function blacklistRefusal(
	entry: { reason: string; createdAt: Date },
	owners: readonly string[] = [],
	language: BotLanguage = "en",
): TitledRefusal {
	const since = Math.floor(new Date(entry.createdAt).getTime() / 1_000);
	const names = eitherOf(
		language,
		owners.map((name) => `**${name}**`),
	);
	const ask =
		owners.length === 0
			? say(language, "askOwner")
			: say(language, owners.length === 1 ? "askOne" : "askMany", { names });
	const bot = botName();

	return {
		title: `🚫 ${say(language, "blockedTitle", { bot })}`,
		message: say(language, "blocked", { bot }),
		fields: [
			{
				name: say(language, "blockedReason"),
				value: entry.reason.trim() === "" ? say(language, "blockedNoReason") : entry.reason.slice(0, 1_000),
			},
			{
				name: say(language, "blockedSince"),
				value: Number.isFinite(since)
					? `<t:${String(since)}:D> (<t:${String(since)}:R>)`
					: say(language, "blockedUnknown"),
			},
			{
				name: say(language, "blockedMistake"),
				value: `${ask}${say(language, "sentenceGap")}${say(language, "askOnly")}`,
			},
		],
		tone: "error",
	};
}

function pausedRefusal(language: BotLanguage): string {
	return say(language, "paused", { bot: botName() });
}

/** The gates a control anybody may press passes, since whoever posted it having passed them says nothing about them. */
export async function checkOpenControl(
	client: TestifyClient,
	who: { userId: string; guildId: string; locale?: string | null },
	command: string,
): Promise<CheckFailure> {
	const language = readerLanguage(who);
	if (client.paused) return pausedRefusal(language);

	const blacklisted = await findBlacklistEntry(who.userId);
	if (blacklisted) return blacklistRefusal(blacklisted, await ownerNames(client), language);

	return (await checkSwitchedOff(command, who.guildId, language))?.failure ?? null;
}

/** The gates a right-click action and its form pass: those of its command, then its own permissions and the bot's. */
export async function checkContextMenu(
	client: TestifyClient,
	interaction: {
		user: { id: string };
		guildId: string;
		locale?: string;
		memberPermissions: Readonly<PermissionsBitField>;
		appPermissions: Readonly<PermissionsBitField>;
	},
	menu: { switchedBy: string; permissions?: PermissionResolvable[]; botPermissions?: PermissionResolvable[] },
): Promise<CheckFailure> {
	const who = { userId: interaction.user.id, guildId: interaction.guildId, locale: interaction.locale ?? null };
	const refused = await checkOpenControl(client, who, menu.switchedBy);
	if (refused !== null) return refused;

	const language = readerLanguage(who);
	const missing = interaction.memberPermissions.missing(new PermissionsBitField(menu.permissions ?? []));
	if (missing.length > 0) return lacking(language, "youNeed", missing);

	const botMissing = interaction.appPermissions.missing(new PermissionsBitField(menu.botPermissions ?? []));
	return botMissing.length > 0 ? lacking(language, "iNeed", botMissing) : null;
}

/** The gates `/play` passes, for a control anybody may press to queue music. */
export async function checkMusicControl(
	client: TestifyClient,
	who: { userId: string; guildId: string; member: CommandInput["member"] },
): Promise<CheckFailure> {
	const refused = await checkOpenControl(client, who, "play");
	if (refused !== null) return refused;

	return musicGate(who.guildId, who.member);
}

export async function checkCasinoPlay(
	client: TestifyClient,
	who: { userId: string; guildId: string },
	game: CasinoGame,
): Promise<CheckFailure> {
	const refused = await checkOpenControl(client, who, CASINO_COMMAND);
	if (refused !== null) return refused;

	return casinoRefusal(await readCasinoSettings(who.guildId), game);
}

/** Nobody bypasses a switch, the bot owner included. */
async function checkSwitchedOff(name: string, guildId: string | null, language: BotLanguage): Promise<Refusal | null> {
	if (isAlwaysEnabled(name)) return null;

	if ((await disabledGlobally()).includes(name)) {
		return refused("off_everywhere", {
			title: `${theme.emoji.maintenance} ${say(language, "maintenanceTitle")}`,
			message: say(language, "maintenance", { name }),
		});
	}

	if (guildId !== null && (await disabledInGuild(guildId)).includes(name)) {
		return refused("off_here", say(language, "offHere"));
	}

	return null;
}

/** Which subcommand was used: null for a command without them, undefined for a prefix run that named none it has. */
function subcommandRun(interaction: CommandInput, command: Command): Subcommand | null | undefined {
	if (command.subcommands === undefined) return null;

	let chosen: string | null;
	try {
		chosen = interaction.options.getSubcommand(false);
	} catch (error) {
		// The prefix reader throws on its first read when the words typed name no subcommand.
		if (error instanceof UserFacingError) return undefined;
		throw error;
	}

	return command.subcommands.find((subcommand) => subcommand.name === chosen) ?? null;
}

/** Both shapes a member arrives in carry permissions, and only one of them is already a bitfield. */
function permissionsOf(member: NonNullable<CommandInput["member"]>): PermissionsBitField {
	return typeof member.permissions === "string"
		? new PermissionsBitField(BigInt(member.permissions))
		: new PermissionsBitField(member.permissions);
}

/** A slash interaction hands roles back as a manager; a raw API member hands back the ids themselves. */
function roleIdsOf(member: CommandInput["member"]): string[] {
	if (member === null) return [];
	if (Array.isArray(member.roles)) return member.roles;

	return [...member.roles.cache.keys()];
}

/** The music system's switch and DJ roles, which Manage Server always passes. */
async function musicGate(guildId: string, member: CommandInput["member"]): Promise<CheckFailure> {
	const settings = normaliseMusicSettings(await getMusicSettings(guildId));

	return musicRefusal(settings, {
		roleIds: roleIdsOf(member),
		manager: member !== null && permissionsOf(member).has(PermissionFlagsBits.ManageGuild),
	});
}

/** Gated here so no music command can forget it; `/music system` is the way back in. */
async function checkMusicSystem(
	interaction: CommandInput,
	command: Command,
	subcommand: Subcommand | null,
): Promise<CheckFailure> {
	if (command.category !== "music" || interaction.guildId === null) return null;
	if (subcommand?.name === MUSIC_SYSTEM_SUBCOMMAND) return null;

	return musicGate(interaction.guildId, interaction.member);
}

/** The casino's switch and its per-game switches; settings and stats stay reachable while it is closed. */
async function checkCasino(
	interaction: CommandInput,
	command: Command,
	subcommand: Subcommand | null,
): Promise<CheckFailure> {
	if (command.name !== CASINO_COMMAND || interaction.guildId === null) return null;

	const chosen = subcommand?.name ?? null;
	if (chosen === CASINO_SETTINGS_SUBCOMMAND || chosen === CASINO_STATS_SUBCOMMAND) return null;

	return casinoRefusal(
		await readCasinoSettings(interaction.guildId),
		chosen !== null && isCasinoGame(chosen) ? chosen : null,
	);
}

function checkCooldown(
	interaction: CommandInput,
	command: Command,
	client: TestifyClient,
	language: BotLanguage,
): CheckFailure {
	if (!command.cooldown || client.isOwner(interaction.user.id)) return null;

	// Per guild, because the features a cooldown protects are per guild.
	const key = `${interaction.guildId ?? "dm"}:${command.name}:${interaction.user.id}`;
	const now = Date.now();
	const readyAt = cooldowns.get(key) ?? 0;

	if (readyAt > now) return say(language, "cooldown", { time: durationIn(language, readyAt - now) });

	cooldowns.set(key, now + command.cooldown);
	if (cooldowns.size > 5_000) {
		for (const [entry, expiry] of cooldowns) if (expiry <= now) cooldowns.delete(entry);
	}

	return null;
}

/** Used by the tests. */
export function clearCooldowns(): void {
	cooldowns.clear();
}
