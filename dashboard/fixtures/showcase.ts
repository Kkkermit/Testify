import {
	ANALYTICS_WINDOWS,
	type AudienceReport,
	AUTOMATIC_ACTIONS,
	type BotActivityReport,
	type CommandCatalogue,
	type CommandSummary,
	type FunnelReport,
	type GrowthReport,
	type GuildUsageReport,
	type GuildUsageRow,
	type LiveRead,
	type ManageableGuild,
	type MeResponse,
	type OwnerGuildDetail,
	type OwnerGuildPage,
	type OwnerGuildRow,
	type OwnerStats,
	type PanelsReport,
	type ReliabilityReport,
	type RetentionReport,
	type RunOutcome,
	type RunRow,
	type RunsBody,
	type RunsPage,
	type ShardlensStatus,
	type Tally,
	type TopRunners,
	type UsageDay,
	type UsageReport,
} from "@testify/shared";
import { http, HttpResponse } from "msw";
import { overview } from "@/test/fixtures/server";

/** A busy, made-up bot for looking round the owner console: every figure is invented, and the same on every reload. */

const DAY_MS = 86_400_000;
const COLLECTOR = "https://stats.example.com";
const DETAIL_DAYS = 14;

function seeded(seed: string): () => number {
	let state = [...seed].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 2_654_435_761), 1_779_033_703);
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
		mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
	};
}

const between = (random: () => number, low: number, high: number): number => Math.round(low + random() * (high - low));

const sumOf = (values: number[]): number => values.reduce((total, value) => total + value, 0);

function windowOf(raw: string | null): number {
	const days = Number(raw);
	return (ANALYTICS_WINDOWS as readonly number[]).includes(days) ? days : 30;
}

function dayList(days: number, now = Date.now()): string[] {
	return Array.from({ length: days }, (_, index) =>
		new Date(now - (days - 1 - index) * DAY_MS).toISOString().slice(0, 10),
	);
}

/** Busier at weekends and growing slowly across the window, with a little noise. */
function series(seed: string, days: number, base: number): number[] {
	const random = seeded(seed);
	return dayList(days).map((day, index) => {
		const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
		const weekend = weekday === 0 || weekday === 6 ? 1.3 : 1;
		const trend = 0.8 + (0.4 * index) / Math.max(1, days - 1);
		return Math.round(base * weekend * trend * (0.85 + random() * 0.3));
	});
}

const tallies = (rows: [string, number][]): Tally[] =>
	rows
		.filter(([, count]) => count > 0)
		.map(([key, count]) => ({ key, count }))
		.sort((a, b) => b.count - a.count);

type Spec = [name: string, category: string, description: string, weight: number];

const COMMAND_SPECS: Spec[] = [
	["rank", "levelling", "Shows your level and XP.", 90],
	["play", "music", "Plays a song in your voice channel.", 85],
	["daily", "economy", "Collects your daily coins.", 80],
	["work", "economy", "Works a shift for coins.", 70],
	["help", "info", "Lists what the bot can do.", 60],
	["casino", "casino", "Plays a casino game.", 55],
	["music", "music", "Controls the music player.", 50],
	["leaderboard", "economy", "Shows the top ten.", 45],
	["balance", "economy", "Shows a wallet and bank.", 44],
	["warn", "moderation", "Warns a member.", 30],
	["remind", "info", "Sets a reminder.", 28],
	["economy", "economy", "Sets up and tunes the economy.", 26],
	["shop", "economy", "Opens the shop.", 25],
	["ask", "info", "Answers a question from the help articles.", 22],
	["profile", "info", "Shows or sets a profile.", 20],
	["levelling", "levelling", "Sets up levelling.", 18],
	["ticket", "tickets", "Opens or sets up tickets.", 17],
	["mute", "moderation", "Times a member out.", 15],
	["fun", "fun", "Jokes, generators and other nonsense.", 15],
	["giveaway", "giveaway", "Starts and runs giveaways.", 12],
	["idea", "community", "Posts an idea to the board.", 11],
	["birthday", "community", "Shares your birthday with the server.", 10],
	["case", "moderation", "Looks up a moderation case.", 9],
	["ban", "moderation", "Bans a member.", 8],
	["kick", "moderation", "Kicks a member.", 7],
	["clear", "moderation", "Deletes recent messages.", 7],
	["serverinfo", "info", "Shows facts about the server.", 6],
	["welcome", "community", "Sets up the greeting.", 5],
	["starboard", "community", "Sets up the starboard.", 4],
	["role-menu", "community", "Makes a menu members pick roles from.", 4],
	["trivia", "games", "Asks a trivia question.", 3],
	["settings", "settings", "Opens the server's settings.", 3],
	["ping", "info", "Checks the bot is awake.", 2],
	["temp-voice", "community", "Sets up join to create.", 1],
	["schedule", "community", "Posts a message later.", 1],
	["appeals", "moderation", "Sets up ban appeals.", 0],
	["invites", "community", "Shows who invited whom.", 0],
];

const command = ([name, category, description]: Spec): CommandSummary => ({
	name,
	description,
	category,
	aliases: [],
	subcommands: [],
	options: [],
	permissions: category === "moderation" ? ["ModerateMembers"] : [],
	botPermissions: [],
	cooldownMs: null,
	guildOnly: category !== "info",
	ownerOnly: false,
	nsfw: false,
});

export const catalogue: CommandCatalogue = {
	prefix: "t?",
	categories: [...new Set(COMMAND_SPECS.map(([, category]) => category))],
	commands: COMMAND_SPECS.map(command),
};

const commandNames = new Set(catalogue.commands.map((entry) => entry.name));

interface Server {
	id: string;
	name: string;
	members: number;
	joinedDaysAgo: number;
	share: number;
	configured: string[];
}

const SERVERS: Server[] = [
	["Pixel Harbour", 48_210, 410, 0.24, ["levelling", "welcome", "tickets", "music"]],
	["Night Owls Study Hall", 21_904, 380, 0.16, ["levelling", "reminders", "starboard"]],
	["Cozy Craft SMP", 12_455, 300, 0.12, ["economy", "casino", "levelling"]],
	["Synthwave Lounge", 9_870, 250, 0.1, ["music", "starboard"]],
	["The Speedrun Archive", 7_301, 220, 0.08, ["levelling", "audit-log"]],
	["Tabletop Tuesdays", 4_532, 190, 0.07, ["giveaways", "birthdays"]],
	["Indie Dev Corner", 3_118, 150, 0.06, ["ideas", "tickets"]],
	["Ramen Appreciation Society", 2_047, 120, 0.05, ["welcome"]],
	["Lofi & Sketches", 1_260, 90, 0.04, ["music"]],
	["Weekend Raid Squad", 860, 60, 0.03, ["casino", "economy"]],
	["Language Exchange Café", 512, 30, 0.02, []],
	["Quiet Library", 211, 12, 0.02, []],
	["Brand New Server", 34, 1, 0.01, []],
].map(([name, members, joinedDaysAgo, share, configured], index) => ({
	id: `9100000000000000${String(index + 10)}`,
	name: name as string,
	members: members as number,
	joinedDaysAgo: joinedDaysAgo as number,
	share: share as number,
	configured: configured as string[],
}));

const joinedAt = (server: Server): string => new Date(Date.now() - server.joinedDaysAgo * DAY_MS).toISOString();

const serverById = (id: string): Server => SERVERS.find((server) => server.id === id) ?? SERVERS[0]!;

const guildRow = (server: Server, count: number): GuildUsageRow => ({
	guildId: server.id,
	name: server.name,
	iconUrl: null,
	memberCount: server.members,
	count,
});

export const me: MeResponse = {
	user: { id: "100000000000000001", username: "you", avatarUrl: null },
	isOwner: true,
	guilds: [
		...SERVERS.slice(0, 6).map((server): ManageableGuild => ({
			id: server.id,
			name: server.name,
			iconUrl: null,
			memberCount: server.members,
			botPresent: true,
			canInvite: true,
			areas: null,
		})),
		{
			id: "910000000000000099",
			name: "A Server Without the Bot",
			iconUrl: null,
			memberCount: null,
			botPresent: false,
			canInvite: true,
			areas: null,
		},
	],
	blacklist: null,
};

const stats: OwnerStats = {
	guilds: SERVERS.length,
	users: sumOf(SERVERS.map((server) => server.members)),
	uptimeMs: 3 * DAY_MS + 4 * 3_600_000,
	memoryMb: 212,
	commands: catalogue.commands.length,
	database: "connected",
};

function dailyRuns(seed: string, days: number, base: number): UsageDay[] {
	const counts = series(`${seed}:runs`, days, base);
	const random = seeded(`${seed}:failures`);
	return dayList(days).map((day, index) => {
		const count = counts[index] ?? 0;
		return { day, count, failures: Math.round(count * (0.004 + random() * 0.012)) };
	});
}

function commandCounts(seed: string, total: number): [Spec, number, number][] {
	const random = seeded(seed);
	const weights = sumOf(COMMAND_SPECS.map(([, , , weight]) => weight));
	return COMMAND_SPECS.map((spec) => {
		const count = Math.round((total * spec[3] * (0.8 + random() * 0.4)) / weights);
		return [spec, count, Math.round(count * random() * 0.03)];
	});
}

const SCREENS = [
	"/guilds/:guildId",
	"/guilds/:guildId/levelling",
	"/guilds/:guildId/welcome",
	"/guilds/:guildId/members",
	"/guilds/:guildId/settings",
	"/guilds/:guildId/tickets",
	"/guilds/:guildId/insights",
	"/guilds/:guildId/changes",
	"/guilds/:guildId/economy",
	"/guilds/:guildId/music",
	"/guilds",
	"/account",
];

function usageReport(days: number): UsageReport {
	const daily = dailyRuns("fleet", days, 1_850);
	const runs = sumOf(daily.map((day) => day.count));
	const counts = commandCounts(`fleet:${String(days)}`, runs);
	const rows = counts.map(([[name, category], count, failures]) => ({ command: name, category, count, failures }));
	const used = rows.filter((row) => row.count > 0).sort((a, b) => b.count - a.count);
	const random = seeded(`fleet:slow:${String(days)}`);

	return {
		days,
		runs,
		failures: sumOf(daily.map((day) => day.failures)),
		activeGuilds: SERVERS.length - 1,
		commandsUsed: used.length,
		commandsTotal: catalogue.commands.length,
		surfaces: { slash: Math.round(runs * 0.87), prefix: runs - Math.round(runs * 0.87) },
		daily,
		mostUsed: used.slice(0, 10),
		leastUsed: [...rows].sort((a, b) => a.count - b.count || a.command.localeCompare(b.command)).slice(0, 10),
		busiestGuilds: SERVERS.slice(0, 10).map((server) => guildRow(server, Math.round(runs * server.share))),
		dashboardGuilds: SERVERS.slice(0, 8).map((server, index) =>
			guildRow(server, Math.round((days * 9 * (8 - index)) / 4)),
		),
		detailDays: Math.min(days, DETAIL_DAYS),
		slowest: used
			.slice(0, 18)
			.map((row) => {
				const slowMs =
					row.command === "play" || row.command === "casino"
						? between(random, 2_400, 4_800)
						: between(random, 180, 1_900);
				return {
					command: row.command,
					category: row.category,
					runs: row.count,
					typicalMs: Math.round(slowMs / 3.5),
					slowMs,
				};
			})
			.sort((a, b) => b.slowMs - a.slowMs)
			.slice(0, 10),
		screens: SCREENS.map((route, index) => ({ route, count: Math.round((days * 40) / (index + 1)) })),
		collector: COLLECTOR,
	};
}

function guildUsage(guildId: string, days: number): GuildUsageReport {
	const server = serverById(guildId);
	const daily = dailyRuns(`guild:${server.id}`, days, Math.max(2, 1_850 * server.share));
	const runs = sumOf(daily.map((day) => day.count));
	const commands = commandCounts(`guild:${server.id}:${String(days)}`, runs)
		.map(([[name, category], count, failures]) => ({ command: name, category, count, failures }))
		.filter((row) => row.count > 0)
		.sort((a, b) => b.count - a.count);

	return {
		guild: { ...guildRow(server, runs), joinedAt: joinedAt(server) },
		days,
		detailDays: Math.min(days, DETAIL_DAYS),
		runs,
		failures: sumOf(daily.map((day) => day.failures)),
		surfaces: { slash: Math.round(runs * 0.85), prefix: runs - Math.round(runs * 0.85) },
		daily,
		commands,
		dashboardViews: Math.round(days * 6 * server.share * 10),
		people: Math.round(server.members * 0.18),
		collector: COLLECTOR,
	};
}

function ownerGuilds(url: URL): OwnerGuildPage {
	const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
	const perPage = Math.max(1, Number(url.searchParams.get("perPage")) || 25);
	const sort = url.searchParams.get("sort") ?? "members";
	const inactiveOnly = url.searchParams.get("filter") === "inactive";
	const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
	const runs = sumOf(dailyRuns("fleet", 30, 1_850).map((day) => day.count));

	const rows: OwnerGuildRow[] = SERVERS.map((server) => ({
		id: server.id,
		name: server.name,
		iconUrl: null,
		memberCount: server.members,
		joinedAt: joinedAt(server),
		configured: server.configured,
		commands: server.joinedDaysAgo < 2 ? 0 : Math.round(runs * server.share),
		dashboardViews: server.configured.length * 14,
	}));
	const byMembers = (a: OwnerGuildRow, b: OwnerGuildRow): number => b.memberCount - a.memberCount;
	const order: Record<string, (a: OwnerGuildRow, b: OwnerGuildRow) => number> = {
		members: byMembers,
		fewest: (a, b) => a.memberCount - b.memberCount,
		newest: (a, b) => (b.joinedAt ?? "").localeCompare(a.joinedAt ?? ""),
		oldest: (a, b) => (a.joinedAt ?? "").localeCompare(b.joinedAt ?? ""),
		commands: (a, b) => (b.commands ?? 0) - (a.commands ?? 0),
		quietest: (a, b) => (a.commands ?? 0) - (b.commands ?? 0),
		dashboard: (a, b) => (b.dashboardViews ?? 0) - (a.dashboardViews ?? 0),
		name: () => 0,
	};
	const listed = rows
		.filter(
			(row) =>
				(query === "" || row.name.toLowerCase().includes(query) || row.id === query) &&
				(!inactiveOnly || row.commands === 0),
		)
		.sort((a, b) => (order[sort] ?? byMembers)(a, b) || a.name.localeCompare(b.name));

	return {
		items: listed.slice((page - 1) * perPage, page * perPage),
		total: listed.length,
		page,
		perPage,
		analytics: null,
	};
}

function guildDetail(guildId: string): OwnerGuildDetail {
	const server = serverById(guildId);
	const runs = sumOf(dailyRuns("fleet", 30, 1_850).map((day) => day.count));
	return {
		id: server.id,
		name: server.name,
		iconUrl: null,
		memberCount: server.members,
		channelCount: 18 + server.configured.length * 3,
		roleCount: 12 + server.configured.length,
		joinedAt: joinedAt(server),
		createdAt: new Date(Date.now() - (server.joinedDaysAgo + 400) * DAY_MS).toISOString(),
		ownerId: "700000000000000001",
		nickname: null,
		highestRole: "Bots",
		missingPermissions: server.configured.length === 0 ? ["ManageRoles"] : [],
		configured: server.configured,
		usage: Math.round(runs * server.share),
		dashboardViews: server.configured.length * 14,
		analytics: null,
	};
}

const USER_LANGUAGES: [string, number][] = [
	["en-US", 4_100],
	["en-GB", 1_900],
	["de", 1_350],
	["pt-BR", 1_100],
	["es-ES", 880],
	["fr", 760],
	["ru", 540],
	["pl", 410],
	["tr", 300],
	["ja", 260],
	["nl", 220],
	["ko", 180],
	["it", 170],
	["sv-SE", 90],
	["uk", 60],
];

/** Evenings and weekends, as a chat server is. */
const hourWeight = (weekday: number, hour: number): number =>
	(0.15 + Math.exp(-((hour - 20) ** 2) / 18) + 0.4 * Math.exp(-((hour - 13) ** 2) / 10)) * (weekday >= 6 ? 1.35 : 1);

function audience(days: number, timezone: string): AudienceReport {
	const users = series("people", days, 640);
	const fresh = series("people:new", days, 45);
	const random = seeded(`hours:${String(days)}`);
	return {
		days,
		daily: dayList(days).map((day, index) => ({
			day,
			users: users[index] ?? 0,
			newUsers: fresh[index] ?? 0,
		})),
		stickiness: 0.28,
		userLanguages: tallies(USER_LANGUAGES.map(([key, count]) => [key, Math.round((count * days) / 30)])),
		serverLanguages: tallies([
			["en-US", 6],
			["de", 2],
			["pt-BR", 2],
			["en-GB", 1],
			["fr", 1],
			["ja", 1],
		]),
		tiers: tallies([
			["member", 21_400],
			["manager", 2_300],
			["admin", 1_150],
			["dm", 640],
		]),
		contexts: tallies([
			["0", 23_900],
			["1", 1_200],
			["2", 310],
		]),
		hours: {
			timezone,
			cells: Array.from({ length: 7 }, (_, row) => row + 1).flatMap((weekday) =>
				Array.from({ length: 24 }, (_, hour) => ({
					weekday,
					hour,
					count: Math.round(hourWeight(weekday, hour) * 120 * (0.85 + random() * 0.3) * (days / 30)),
				})),
			),
		},
	};
}

function growth(days: number): GrowthReport {
	const joins = series("growth:joins", days, 4);
	const leaves = series("growth:leaves", days, 1.4);
	const joined = sumOf(joins);
	return {
		days,
		daily: dayList(days).map((day, index) => ({ day, joins: joins[index] ?? 0, leaves: leaves[index] ?? 0 })),
		joins: joined,
		leaves: sumOf(leaves),
		activation: { joined, activated: Math.round(joined * 0.68), rate: 0.68 },
		installs: { active: 371, inactive: 41 },
		sizeAtInstall: tallies([
			["1-10", Math.round(joined * 0.34)],
			["11-100", Math.round(joined * 0.38)],
			["101-1k", Math.round(joined * 0.2)],
			["1k-10k", Math.round(joined * 0.07)],
			["10k+", Math.round(joined * 0.01)],
		]),
		lifetimes: tallies([
			["<1d", Math.round(sumOf(leaves) * 0.31)],
			["1-7d", Math.round(sumOf(leaves) * 0.27)],
			["7-30d", Math.round(sumOf(leaves) * 0.19)],
			["30-90d", Math.round(sumOf(leaves) * 0.14)],
			["90d+", Math.round(sumOf(leaves) * 0.09)],
		]),
		serverCount: { ours: 412, discord: 412, warn: false },
	};
}

const BUTTONS: [string, [string, number][]][] = [
	[
		"music",
		[
			["pause", 900],
			["skip", 1_400],
			["volume", 520],
			["queue", 380],
			["stop", 210],
		],
	],
	[
		"roulette",
		[
			["red", 1_100],
			["black", 1_050],
			["number", 640],
			["spin", 300],
		],
	],
	[
		"shop",
		[
			["buy", 820],
			["page", 610],
			["sell", 140],
		],
	],
	[
		"casino",
		[
			["again", 1_200],
			["hit", 730],
			["stand", 690],
			["double", 120],
		],
	],
	[
		"leaderboard",
		[
			["scope", 410],
			["board", 380],
		],
	],
	[
		"balance",
		[
			["refresh", 300],
			["deposit", 280],
			["withdraw", 160],
		],
	],
	[
		"levelling",
		[
			["tab", 220],
			["boost", 90],
			["ignore", 40],
		],
	],
	[
		"ticket",
		[
			["open", 190],
			["claim", 120],
			["close", 110],
		],
	],
	[
		"idea",
		[
			["up", 260],
			["down", 90],
			["accept", 18],
		],
	],
	["rolemenu", [["choose", 340]]],
	[
		"help",
		[
			["category", 520],
			["page", 230],
		],
	],
];

function panels(days: number): PanelsReport {
	const scale = days / 30;
	const random = seeded(`panels:${String(days)}`);
	return {
		days,
		buttons: BUTTONS.map(([id, actions]) => {
			const counted = actions.map(([key, count]): [string, number] => [key, Math.round(count * scale)]);
			const presses = sumOf(counted.map(([, count]) => count));
			return { id, presses, failures: Math.round(presses * random() * 0.02), actions: tallies(counted) };
		}).sort((a, b) => b.presses - a.presses),
		forms: [
			{ id: "remind", shown: 410, submitted: 371 },
			{ id: "musicadd", shown: 380, submitted: 290 },
			{ id: "roulette", shown: 260, submitted: 141 },
			{ id: "moderationForm", shown: 120, submitted: 104 },
			{ id: "ticket", shown: 95, submitted: 61 },
			{ id: "deletemydata", shown: 22, submitted: 6 },
		]
			.map((row) => ({ ...row, shown: Math.round(row.shown * scale), submitted: Math.round(row.submitted * scale) }))
			.sort((a, b) => b.shown - b.submitted - (a.shown - a.submitted)),
	};
}

function activity(days: number): BotActivityReport {
	const scale = days / 30;
	const by = (rows: [string, number][]): Tally[] =>
		tallies(rows.map(([key, count]) => [key, Math.round((count * Math.min(days, DETAIL_DAYS)) / 30)]));
	return {
		days,
		detailDays: Math.min(days, DETAIL_DAYS),
		music: {
			played: Math.round(6_400 * scale),
			skipped: Math.round(310 * scale),
			refused: Math.round(190 * scale),
			sources: by([
				["youtube", 4_700],
				["soundcloud", 1_500],
				["other", 200],
			]),
			causes: [
				["youtube", "bot-check", 120],
				["youtube", "session", 64],
				["youtube", "forbidden", 41],
				["youtube", "unavailable", 38],
				["soundcloud", "drm", 33],
				["youtube", "unplayable", 21],
				["soundcloud", "broken", 12],
				["youtube", "error", 6],
			].map(([source, reason, count]) => ({
				source: source as string,
				reason: reason as string,
				count: Math.round(((count as number) * Math.min(days, DETAIL_DAYS)) / 30),
			})),
		},
		support: {
			answered: Math.round(830 * scale),
			refused: Math.round(140 * scale),
			answeredBy: by([
				["search", 520],
				["model", 210],
				["picked", 100],
			]),
			refusedBy: by([
				["search", 95],
				["model", 45],
			]),
			articles: by([
				["levelling-setup", 140],
				["adding-the-bot", 120],
				["music-not-playing", 96],
				["tickets", 71],
				["economy-basics", 64],
				["welcome-messages", 41],
				["dashboard-sign-in", 33],
				["casino", 30],
			]),
		},
		refusals: {
			total: Math.round(2_150 * scale),
			reasons: by([
				["cooldown", 1_240],
				["you_lack", 310],
				["off_here", 190],
				["no_subcommand", 120],
				["guild_only", 95],
				["bot_lacks", 70],
				["music", 46],
				["casino", 30],
				["owner_only", 22],
				["paused", 12],
				["blacklisted", 9],
				["off_everywhere", 4],
			]),
			commands: by([
				["daily", 640],
				["work", 520],
				["rob", 210],
				["warn", 110],
				["play", 96],
				["ban", 60],
				["casino", 44],
			]),
		},
		automatic: AUTOMATIC_ACTIONS.map((action, index) => ({
			action,
			count: Math.round(([3_100, 410, 5_200, 180, 940, 310, 85, 26][index] ?? 0) * scale),
		})),
		changes: {
			total: Math.round(560 * scale),
			screens: by([
				["/guilds/:guildId/levelling", 140],
				["/guilds/:guildId/welcome", 110],
				["/guilds/:guildId/settings", 96],
				["/guilds/:guildId/tickets", 60],
				["/guilds/:guildId/economy", 51],
				["/guilds/:guildId/music", 38],
				["/guilds/:guildId", 30],
				["/guilds/:guildId/starboard", 21],
			]),
			ways: by([
				["save", 480],
				["setup", 44],
				["put_back", 21],
				["backup", 15],
			]),
		},
	};
}

function reliability(days: number): ReliabilityReport {
	const daily = dailyRuns("fleet", days, 1_850);
	const random = seeded(`reliability:${String(days)}`);
	const detail = Math.min(days, DETAIL_DAYS);
	const recent = daily.slice(-detail);
	const runs = sumOf(recent.map((day) => day.count));
	const window = dayList(days);
	const pings = series("ping", days, 95);
	return {
		days,
		daily: daily.map((day) => ({
			day: day.day,
			runs: day.count,
			errors: day.failures,
			late: Math.round(day.count * random() * 0.006),
		})),
		totals: {
			runs,
			missedDeadlines: Math.round(runs * 0.004),
			noResponse: Math.round(runs * 0.0009),
			errors: sumOf(recent.map((day) => day.failures)),
			over3sRate: 0.0042,
			p50Ms: 140,
			p95Ms: 860,
			p99Ms: 2_300,
		},
		from: new Date(Date.now() - (detail - 1) * DAY_MS).toISOString().slice(0, 10) + "T00:00:00.000Z",
		errorsByCode: tallies([
			["50013", 64],
			["10062", 41],
			["50001", 22],
			["TimeoutError", 11],
			["40060", 6],
		]),
		rateLimits: {
			daily: window.map((day, index) => ({ day, count: index === window.length - 4 ? 37 : between(random, 0, 4) })),
			routes: [
				{ route: "/channels/:id/messages", scope: "user", count: 46 },
				{ route: "/guilds/:id/members/:id", scope: "shared", count: 21 },
				{ route: "/interactions/:id/:token/callback", scope: "global", count: 7 },
			],
		},
		shards: {
			now: [
				{ shard: 0, pingMs: 84, stale: false },
				{ shard: 1, pingMs: 91, stale: false },
				{ shard: 2, pingMs: 213, stale: false },
				{ shard: 3, pingMs: 88, stale: true },
			],
			daily: window.map((day, index) => ({ day, pingMs: pings[index] ?? null })),
			events: [
				[2, "resumed", null, 2 * DAY_MS],
				[2, "reconnecting", 1006, 2 * DAY_MS + 40_000],
				[0, "resumed", null, 5 * DAY_MS],
				[3, "ready", null, 9 * DAY_MS],
				[3, "disconnected", 4000, 9 * DAY_MS + 95_000],
				[1, "resumed", null, 12 * DAY_MS],
			].map(([shard, state, closeCode, ago]) => ({
				at: new Date(Date.now() - (ago as number) - 3_600_000).toISOString(),
				shard: shard as number,
				state: state as string,
				closeCode: closeCode as number | null,
			})),
		},
	};
}

function funnel(url: URL): FunnelReport {
	const steps = (url.searchParams.get("steps") ?? "").split(",").map((step) => step.trim());
	const hours = Number(url.searchParams.get("hours")) || 24;
	const random = seeded(`funnel:${steps.join(",")}:${String(hours)}`);
	let users = between(random, 900, 1_400);
	return {
		days: windowOf(url.searchParams.get("days")),
		hours,
		steps: steps.map((name, index) => {
			if (index > 0) users = Math.round(users * (0.3 + random() * 0.45));
			return { command: name, users, medianSeconds: index === 0 ? null : between(random, 40, hours * 900) };
		}),
	};
}

function retention(url: URL): RetentionReport {
	const interval = url.searchParams.get("interval") === "day" ? "day" : "week";
	const periods = interval === "day" ? 14 : 8;
	const step = interval === "day" ? DAY_MS : 7 * DAY_MS;
	const start = url.searchParams.get("start") ?? "";
	const back = url.searchParams.get("back");
	const random = seeded(`retention:${start}:${back ?? ""}:${interval}`);
	const count = interval === "day" ? 14 : 10;
	const keep = back === null ? 0.48 : 0.26;

	return {
		days: windowOf(url.searchParams.get("days")),
		interval,
		start,
		back,
		periods,
		cohorts: Array.from({ length: count }, (_, index) => {
			const age = count - 1 - index;
			const size = between(random, 40, 220);
			return {
				cohort: new Date(Date.now() - age * step).toISOString().slice(0, 10),
				size,
				retained: Array.from({ length: periods }, (_, period) =>
					period < age ? Math.round(size * keep * 0.82 ** period * (0.85 + random() * 0.3)) : 0,
				),
			};
		}),
	};
}

/** Made-up people, so the run log shows nobody real; their pictures are the lettered fallback. */
const PEOPLE = [
	"maple.fox",
	"quietlynx",
	"mothlight",
	"tidepool",
	"paperplane",
	"ember.wren",
	"saltmarsh",
	"kettle_drum",
	"orbit.owl",
	"fern_and_nettle",
	"lantern",
	"cobalt.hare",
].map((username, index) => ({ userId: `30000000000000000${String(index + 10)}`, username }));

const RUN_SHAPES: { kind: string; command: string | null; sub: string | null; handler: string | null }[] = [
	{ kind: "chat_input", command: "rank", sub: null, handler: null },
	{ kind: "chat_input", command: "play", sub: null, handler: null },
	{ kind: "chat_input", command: "daily", sub: null, handler: null },
	{ kind: "message_command", command: "work", sub: null, handler: null },
	{ kind: "chat_input", command: "casino", sub: "roulette", handler: null },
	{ kind: "button", command: null, sub: null, handler: "shop:buy" },
	{ kind: "button", command: null, sub: null, handler: "music:pause" },
	{ kind: "chat_input", command: "warn", sub: "create", handler: null },
	{ kind: "modal_submit", command: null, sub: null, handler: "moderationForm:warn" },
	{ kind: "user_context", command: "Time out", sub: null, handler: null },
	{ kind: "chat_input", command: "remind", sub: "me", handler: null },
];

const RUN_COUNT = 240;

/** The same few hundred runs on every reload, newest first, a few minutes apart. */
const RUNS: RunRow[] = (() => {
	const random = seeded("runs");
	const now = Date.now();
	let at = now;
	return Array.from({ length: RUN_COUNT }, (_, index) => {
		at -= between(random, 20_000, 400_000);
		const person = PEOPLE[Math.floor(random() ** 1.6 * PEOPLE.length)]!;
		const shape = RUN_SHAPES[Math.floor(random() * RUN_SHAPES.length)]!;
		const server = SERVERS[Math.floor(random() ** 1.4 * SERVERS.length)]!;
		const roll = random();
		const outcome: RunOutcome = roll < 0.9 ? "ok" : roll < 0.95 ? "error" : roll < 0.98 ? "timeout" : "no_response";
		const direct = shape.kind === "chat_input" && random() < 0.05;
		return {
			id: `0190f1a2-0000-7000-8000-${String(index).padStart(12, "0")}`,
			at: new Date(at).toISOString(),
			guildId: direct ? null : server.id,
			guildName: direct ? null : server.name,
			...shape,
			outcome,
			answerMs:
				shape.kind === "message_command"
					? null
					: outcome === "timeout"
						? between(random, 3_100, 6_000)
						: between(random, 60, 1_400),
			userId: index % 37 === 5 ? null : person.userId,
			username: index % 37 === 5 ? null : person.username,
			avatarUrl: null,
		};
	});
})();

const cursorOf = (row: RunRow): string => `${row.at}~${row.id}`;

/** Narrowed and paged the way the collector does it, fifty a page. */
function runsPageFor(body: Partial<RunsBody>): RunsPage {
	const PAGE = 50;
	const from = Date.now() - (body.days ?? 30) * DAY_MS;
	const matching = RUNS.filter(
		(row) =>
			Date.parse(row.at) >= from &&
			(body.guildId === undefined || row.guildId === body.guildId) &&
			(body.command === undefined || row.command === body.command) &&
			(body.userId === undefined || row.userId === body.userId) &&
			(body.outcome === undefined || (body.outcome === "failed" ? row.outcome !== "ok" : row.outcome === body.outcome)),
	);
	const start = body.before === undefined ? 0 : matching.findIndex((row) => cursorOf(row) === body.before) + 1;
	const rows = matching.slice(start, start + PAGE);
	const last = rows.at(-1);
	return { rows, next: rows.length === PAGE && last !== undefined ? cursorOf(last) : null, collector: COLLECTOR };
}

function topRunnersFor(window: TopRunners["window"]): TopRunners {
	const since = Date.now() - (window === "24h" ? DAY_MS : 7 * DAY_MS);
	const counts = new Map<string, number>();
	for (const row of RUNS) {
		if (row.userId === null || Date.parse(row.at) < since) continue;
		counts.set(row.userId, (counts.get(row.userId) ?? 0) + 1);
	}
	return {
		window,
		rows: [...counts]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 25)
			.map(([userId, runs]) => ({
				userId,
				username: PEOPLE.find((person) => person.userId === userId)?.username ?? null,
				avatarUrl: null,
				runs,
			})),
	};
}

/** Moves a little on every read, as the collector's stream does second by second. */
function liveNow(): LiveRead {
	const second = Math.floor(Date.now() / 1_000);
	const random = seeded(`live:${String(second)}`);
	const perSecond = Array.from({ length: 60 }, (_, index) =>
		Math.max(0, Math.round(3 + 2 * Math.sin((second - 60 + index) / 7) + random() * 3)),
	);
	return {
		numbers: {
			at: new Date(second * 1_000).toISOString(),
			perMinute: sumOf(perSecond),
			failed15m: between(random, 0, 6),
			perSecond,
			slowMs: between(random, 700, 1_300),
			shards: [0, 1, 2].map((shard) => ({ shard, pingMs: between(random, 38, 70), fresh: true })),
			servers: SERVERS.length,
		},
		problem: null,
	};
}

const shardlens: ShardlensStatus = {
	state: "sending",
	collector: COLLECTOR,
	mode: "audit",
	queued: 4,
	waitingForResponse: 1,
	dropped: 0,
	failedSends: 0,
	lastProblem: null,
};

/** What the API answers for an unknown command, so a hand-typed funnel shows the refusal the real route gives. */
function unknownCommand(names: (string | null)[]): Response | null {
	return names.some((name) => name !== null && name !== "" && !commandNames.has(name))
		? HttpResponse.json(
				{ error: { code: "unknown_command", message: "That is not one of the bot's commands." } },
				{ status: 400 },
			)
		: null;
}

const daysIn = (request: Request): number => windowOf(new URL(request.url).searchParams.get("days"));

export const showcaseHandlers = [
	http.get("/api/auth/me", () => HttpResponse.json(me)),
	http.get("/api/commands", () => HttpResponse.json(catalogue)),
	http.post("/api/screens", () => new HttpResponse(null, { status: 204 })),
	http.get("/api/owner/stats", () => HttpResponse.json(stats)),
	http.get("/api/owner/guilds", ({ request }) => HttpResponse.json(ownerGuilds(new URL(request.url)))),
	http.get("/api/control/guilds/:guildId", ({ params }) => HttpResponse.json(guildDetail(String(params.guildId)))),
	http.get("/api/guilds/:guildId/overview", ({ params }) => {
		const server = serverById(String(params.guildId));
		return HttpResponse.json({ ...overview, id: server.id, name: server.name, memberCount: server.members });
	}),
	http.get("/api/control/shardlens", () => HttpResponse.json(shardlens)),
	http.get("/api/analytics/usage", ({ request }) => HttpResponse.json(usageReport(daysIn(request)))),
	http.get("/api/analytics/guilds/:guildId", ({ request, params }) =>
		HttpResponse.json(guildUsage(String(params.guildId), daysIn(request))),
	),
	http.get("/api/analytics/audience", ({ request }) =>
		HttpResponse.json(audience(daysIn(request), new URL(request.url).searchParams.get("tz") ?? "UTC")),
	),
	http.get("/api/analytics/growth", ({ request }) => HttpResponse.json(growth(daysIn(request)))),
	http.get("/api/analytics/panels", ({ request }) => HttpResponse.json(panels(daysIn(request)))),
	http.get("/api/analytics/activity", ({ request }) => HttpResponse.json(activity(daysIn(request)))),
	http.get("/api/analytics/reliability", ({ request }) => HttpResponse.json(reliability(daysIn(request)))),
	http.get("/api/analytics/funnel", ({ request }) => {
		const url = new URL(request.url);
		return unknownCommand((url.searchParams.get("steps") ?? "").split(",")) ?? HttpResponse.json(funnel(url));
	}),
	http.get("/api/analytics/live", () => HttpResponse.json(liveNow())),
	http.post("/api/analytics/runs", async ({ request }) =>
		HttpResponse.json(runsPageFor((await request.json()) as Partial<RunsBody>)),
	),
	http.get("/api/analytics/runs/top", ({ request }) =>
		HttpResponse.json(topRunnersFor(new URL(request.url).searchParams.get("window") === "7d" ? "7d" : "24h")),
	),
	http.get("/api/analytics/retention", ({ request }) => {
		const url = new URL(request.url);
		return (
			unknownCommand([url.searchParams.get("start"), url.searchParams.get("back")]) ?? HttpResponse.json(retention(url))
		);
	}),
];
