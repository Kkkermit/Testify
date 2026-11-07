import { type FeatureKey } from "./places";

/** The parts of the bot a host may switch off with `DISABLED_FEATURES`, each declared once with everything it owns. */

export const BOT_FEATURE_KEYS = [
	"music",
	"economy",
	"casino",
	"lottery",
	"treasure",
	"levelling",
	"tickets",
	"giveaways",
	"games",
	"fun",
	"modmail",
	"appeals",
	"starboard",
	"ideas",
	"temp-voice",
	"birthdays",
	"invites",
] as const;

export type BotFeature = (typeof BOT_FEATURE_KEYS)[number];

export interface BotFeatureParts {
	/** What the start-up log calls it. */
	label: string;
	/** Commands, or `command subcommand` for one subcommand of a command another feature shares. */
	commands: readonly string[];
	/** Button handlers, by the id their custom IDs start with. */
	buttons?: readonly string[];
	/** Right-click actions, by name. */
	menus?: readonly string[];
	messageHandlers?: readonly string[];
	/** Gateway events, by file name without `.event.ts`. */
	events?: readonly string[];
	/** Scheduled jobs, by timer name. */
	jobs?: readonly string[];
	/** API paths under `/api`; `:name` stands for any one segment, and a path covers everything under it. */
	routes?: readonly string[];
	/** Dashboard paths, written the same way. */
	screens?: readonly string[];
	/** Help articles, by id. */
	articles?: readonly string[];
	/** What the server overview and the channel pages list for it. */
	overview?: readonly FeatureKey[];
	/** Switched off with any of these, since it cannot work without them. */
	requires?: readonly BotFeature[];
}

const guild = (path: string): string => `/guilds/:guildId/${path}`;

export const BOT_FEATURES: Readonly<Record<BotFeature, BotFeatureParts>> = {
	music: {
		label: "Music",
		commands: ["music", "play"],
		buttons: ["music", "musicadd"],
		jobs: ["music-scratch"],
		routes: [guild("music"), "/control/music"],
		screens: [guild("music")],
		articles: ["music", "music-access", "music-not-playing", "music-queue", "music-volume"],
	},
	economy: {
		label: "Economy",
		commands: [
			"balance",
			"beg",
			"cooldowns",
			"daily",
			"deposit",
			"economy",
			"economy-info",
			"give currency",
			"heist",
			"inventory",
			"leaderboard economy",
			"pet",
			"reset server",
			"reset user",
			"rob",
			"shop",
			"transfer",
			"withdraw",
			"work",
		],
		buttons: ["balance", "board", "heist", "inv", "money", "shop", "tuning"],
		jobs: ["passive-income"],
		routes: [guild("shop-roles"), guild("members/:userId/money")],
		screens: [guild("economy")],
		articles: [
			"bank-and-wallet",
			"cooldown-message",
			"earning-money",
			"economy",
			"economy-admin",
			"heists",
			"jobs",
			"pets",
			"robbing",
			"shop",
		],
	},
	casino: {
		label: "Casino",
		commands: ["casino"],
		buttons: ["casino", "casinoset", "roulette"],
		jobs: ["casino-hands", "roulette-rounds"],
		routes: [guild("casino")],
		screens: [guild("casino")],
		articles: ["casino"],
		overview: ["casino"],
		requires: ["economy"],
	},
	lottery: {
		label: "Lottery",
		commands: ["lottery"],
		jobs: ["lottery"],
		routes: [guild("lottery")],
		screens: [guild("lottery")],
		articles: ["lottery"],
		overview: ["lottery"],
		requires: ["economy"],
	},
	treasure: {
		label: "Treasure drops",
		commands: ["treasure"],
		buttons: ["treasure"],
		messageHandlers: ["treasureDrops"],
		routes: [guild("treasure")],
		screens: [guild("treasure")],
		articles: ["treasure"],
		overview: ["treasure"],
		requires: ["economy"],
	},
	levelling: {
		label: "Levelling",
		commands: ["give xp", "leaderboard levels", "levelling", "rank", "reset levels"],
		buttons: ["levelling"],
		messageHandlers: ["levelling"],
		routes: [guild("levelling"), guild("members/:userId/level"), guild("setup/levelling")],
		screens: [guild("levelling")],
		articles: ["level-rewards", "levelling", "levels-not-counting"],
		overview: ["levelling"],
	},
	tickets: {
		label: "Tickets",
		commands: ["ticket"],
		buttons: ["ticket"],
		routes: [guild("tickets")],
		screens: [guild("tickets")],
		articles: ["tickets", "tickets-for-staff"],
		overview: ["tickets"],
	},
	giveaways: {
		label: "Giveaways",
		commands: ["giveaway"],
		jobs: ["giveaways"],
		routes: [guild("giveaways")],
		screens: [guild("giveaways")],
		articles: ["giveaways"],
	},
	games: {
		label: "Games",
		commands: ["game"],
		articles: ["games"],
	},
	fun: {
		label: "Fun commands",
		commands: ["fun", "how"],
		articles: ["fun-commands"],
	},
	modmail: {
		label: "Mod mail",
		commands: ["modmail"],
		buttons: ["modmail", "modmailsettings", "report"],
		menus: ["Report message"],
		messageHandlers: ["modmailDirect", "modmailReplies"],
		routes: [guild("modmail")],
		screens: [guild("modmail")],
		articles: ["modmail"],
		overview: ["modmail"],
	},
	appeals: {
		label: "Ban appeals",
		commands: ["appeals"],
		buttons: ["appeal", "appealsettings"],
		routes: [guild("appeals"), "/appeals"],
		screens: [guild("appeals"), "/appeals"],
		articles: ["ban-appeals"],
		overview: ["appeals"],
	},
	starboard: {
		label: "Starboard",
		commands: ["starboard"],
		buttons: ["starboardsettings"],
		menus: ["Add to starboard"],
		events: ["starboardDelete", "starboardReactionAdd", "starboardReactionRemove"],
		routes: [guild("starboard")],
		screens: [guild("starboard")],
		articles: ["starboard"],
		overview: ["starboard"],
	},
	ideas: {
		label: "Idea board",
		commands: ["idea"],
		buttons: ["idea", "ideasettings"],
		routes: [guild("ideas")],
		screens: [guild("ideas")],
		articles: ["ideas"],
		overview: ["ideas"],
	},
	"temp-voice": {
		label: "Join to create",
		commands: ["temp-voice"],
		buttons: ["tempvoicesettings"],
		events: ["tempVoice"],
		jobs: ["temp-voice", "temp-voice-first"],
		routes: [guild("temp-voice")],
		screens: [guild("temp-voice")],
		articles: ["temp-voice"],
		overview: ["temp-voice"],
	},
	birthdays: {
		label: "Birthdays",
		commands: ["birthday"],
		buttons: ["birthday"],
		jobs: ["birthdays", "birthdays-first"],
		routes: [guild("birthdays")],
		screens: [guild("birthdays")],
		articles: ["birthdays"],
		overview: ["birthdays"],
	},
	invites: {
		label: "Invite tracking",
		commands: ["invites"],
		buttons: ["invitesettings"],
		events: ["inviteCreate", "inviteDelete", "primeInvites"],
		routes: [guild("invites")],
		screens: [guild("invites")],
		articles: ["invite-tracking"],
		overview: ["invites"],
	},
};

/** What a reader assumes when it is not told otherwise: every feature on. */
export const NONE_OFF: ReadonlySet<BotFeature> = new Set();

export function isBotFeature(value: string): value is BotFeature {
	return (BOT_FEATURE_KEYS as readonly string[]).includes(value);
}

/** What `asked` switches off: those, and every feature that requires one of them, with why each was added. */
export function switchedOff(asked: readonly BotFeature[]): {
	off: ReadonlySet<BotFeature>;
	pulled: { feature: BotFeature; because: BotFeature }[];
} {
	const off = new Set(asked);
	const pulled: { feature: BotFeature; because: BotFeature }[] = [];

	for (let grew = true; grew;) {
		grew = false;
		for (const feature of BOT_FEATURE_KEYS) {
			const because = BOT_FEATURES[feature].requires?.find((needed) => off.has(needed));
			if (off.has(feature) || because === undefined) continue;
			off.add(feature);
			pulled.push({ feature, because });
			grew = true;
		}
	}

	return { off, pulled };
}

type PartKind = "commands" | "buttons" | "menus" | "messageHandlers" | "events" | "jobs" | "articles";

/** The feature that owns a part, or null for a part no feature owns. */
export function ownerOf(kind: PartKind, name: string): BotFeature | null {
	return BOT_FEATURE_KEYS.find((feature) => BOT_FEATURES[feature][kind]?.includes(name) === true) ?? null;
}

/** Whether a part belongs to a feature that is off. */
export function partIsOff(off: ReadonlySet<BotFeature>, kind: PartKind, name: string): boolean {
	const owner = ownerOf(kind, name);
	return owner !== null && off.has(owner);
}

/** Whether `/command` or `/command subcommand` belongs to a feature that is off. */
export function commandIsOff(off: ReadonlySet<BotFeature>, command: string, subcommand?: string | null): boolean {
	return (
		partIsOff(off, "commands", command) ||
		(typeof subcommand === "string" && partIsOff(off, "commands", `${command} ${subcommand}`))
	);
}

const segments = (path: string): string[] => path.split("/").filter((segment) => segment !== "");

/** Whether `path` is `pattern` or under it, where a `:name` segment in the pattern matches any one segment. */
export function pathUnder(pattern: string, path: string): boolean {
	const want = segments(pattern);
	const have = segments(path);
	return want.length <= have.length && want.every((segment, at) => segment.startsWith(":") || segment === have[at]);
}

/** The off feature an API path under `/api` belongs to, or null. */
export function routeIsOff(off: ReadonlySet<BotFeature>, path: string): BotFeature | null {
	return (
		BOT_FEATURE_KEYS.find(
			(feature) => off.has(feature) && (BOT_FEATURES[feature].routes ?? []).some((route) => pathUnder(route, path)),
		) ?? null
	);
}

/** The off feature a dashboard path belongs to, or null. */
export function screenIsOff(off: ReadonlySet<BotFeature>, path: string): BotFeature | null {
	return (
		BOT_FEATURE_KEYS.find(
			(feature) => off.has(feature) && (BOT_FEATURES[feature].screens ?? []).some((screen) => pathUnder(screen, path)),
		) ?? null
	);
}

/** Whether the overview's `key` belongs to a feature that is off. */
export function overviewIsOff(off: ReadonlySet<BotFeature>, key: FeatureKey): boolean {
	return BOT_FEATURE_KEYS.some((feature) => off.has(feature) && BOT_FEATURES[feature].overview?.includes(key) === true);
}
