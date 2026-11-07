import { type AccessArea, type BotFeature, isAccessArea, screenIsOff } from "@testify/shared";
import {
	Activity,
	ArchiveRestore,
	Ban,
	Bell,
	BookOpen,
	Cake,
	CalendarClock,
	CalendarDays,
	ChartColumn,
	ChartLine,
	LayoutGrid,
	ScrollText,
	Shield,
	ShieldAlert,
	Scale,
	Siren,
	Server,
	ShieldCheck,
	Pin,
	SlidersHorizontal,
	Dices,
	ChartPie,
	Coins,
	MessagesSquare,
	FileCode,
	Terminal,
	TrendingUp,
	TriangleAlert,
	Users,
	UserPlus,
	MessageSquareReply,
	Megaphone,
	Music,
	LifeBuoy,
	Lightbulb,
	ListChecks,
	Lock,
	Mailbox,
	Mails,
	Ticket,
	type LucideIcon,
	Gauge,
	Hash,
	Gavel,
	History,
	Inbox,
	KeyRound,
	Gift,
	Gem,
	Sparkles,
	Star,
	Volume2,
	Wallet,
} from "lucide-react";
import { type TranslationKey } from "@/i18n";

export interface NavItem {
	to: string;
	labelKey: TranslationKey;
	icon: LucideIcon;
	hintKey?: TranslationKey;
	exact?: boolean;
	badge?: { kind: "inbox"; guildId: string };
}

export interface NavSection {
	labelKey: TranslationKey;
	icon: LucideIcon;
	items: NavItem[];
}

export interface NavGroup {
	heading?: string;
	headingKey?: TranslationKey;
	guildId?: string;
	items: NavItem[];
	sections?: NavSection[];
}

export interface NavAudience {
	/** `areas` is null, or absent, for somebody who sees every screen of the server. */
	guild: { id: string; name: string; areas?: readonly AccessArea[] | null } | undefined;
	isOwner: boolean;
	/** The server's owner, its admins and the bot's owners, who decide who else may use its dashboard. */
	mayGrant?: boolean | undefined;
	/** Their screens are left out, since the bot does none of what they set up. */
	featuresOff?: ReadonlySet<BotFeature> | undefined;
}

/** Whether somebody given only `areas` may open this path; their overview always, and a granted screen's pages. */
export function mayOpen(pathname: string, guildId: string, areas: readonly AccessArea[] | null | undefined): boolean {
	const base = `/guilds/${guildId}`;
	if (areas === null || areas === undefined) return pathname === base || pathname.startsWith(`${base}/`);
	if (pathname === base || pathname === `${base}/`) return true;
	if (!pathname.startsWith(`${base}/`)) return false;

	const screen = pathname.slice(base.length + 1).split("/")[0] ?? "";
	return isAccessArea(screen) && areas.includes(screen);
}

export function navigationFor({ guild, isOwner, mayGrant = false, featuresOff }: NavAudience): NavGroup[] {
	const guildCommands = guild !== undefined && mayOpen(`/guilds/${guild.id}/commands`, guild.id, guild.areas);
	const groups: NavGroup[] = [
		{
			items: [
				{ to: "/guilds", labelKey: "nav.servers", icon: LayoutGrid, hintKey: "nav.serversHint" },
				{
					to: guildCommands ? `/guilds/${guild.id}/commands` : "/commands",
					labelKey: "nav.commands",
					icon: Terminal,
					hintKey: guildCommands ? "nav.commandsHintGuild" : "nav.commandsHintAll",
				},
				{ to: "/status", labelKey: "nav.status", icon: Activity, hintKey: "nav.statusHint" },
				{ to: "/notifications", labelKey: "nav.notifications", icon: Bell, hintKey: "nav.notificationsHint" },
				{ to: "/help", labelKey: "nav.help", icon: LifeBuoy, hintKey: "nav.helpHint" },
				{ to: "/docs", labelKey: "nav.docs", icon: BookOpen, hintKey: "nav.docsHint", exact: false },
				{ to: "/source-code", labelKey: "nav.source", icon: FileCode, hintKey: "nav.sourceHint", exact: false },
			],
		},
	];

	if (guild !== undefined) {
		const at = (path: string): string => `/guilds/${guild.id}${path}`;
		groups.push({
			heading: guild.name,
			guildId: guild.id,
			items: [
				{ to: at(""), labelKey: "nav.overview", icon: Server, hintKey: "nav.overviewHint" },
				{
					to: at("/inbox"),
					labelKey: "nav.inbox",
					icon: Inbox,
					hintKey: "nav.inboxHint",
					badge: { kind: "inbox", guildId: guild.id },
				},
				{ to: at("/week"), labelKey: "nav.week", icon: CalendarDays, hintKey: "nav.weekHint" },
				{ to: at("/channels"), labelKey: "nav.channels", icon: Hash, hintKey: "nav.channelsHint", exact: false },
				{ to: at("/members"), labelKey: "nav.members", icon: Users, hintKey: "nav.membersHint", exact: false },
				{ to: at("/roles"), labelKey: "nav.roles", icon: Shield, hintKey: "nav.rolesHint", exact: false },
				{ to: at("/settings"), labelKey: "nav.settings", icon: SlidersHorizontal, hintKey: "nav.settingsHint" },
				{ to: at("/backup"), labelKey: "nav.backup", icon: ArchiveRestore, hintKey: "nav.backupHint" },
			],
			sections: [
				{
					labelKey: "nav.community",
					icon: Users,
					items: [
						{ to: at("/welcome"), labelKey: "nav.welcome", icon: UserPlus, hintKey: "nav.welcomeHint" },
						{ to: at("/birthdays"), labelKey: "nav.birthdays", icon: Cake, hintKey: "nav.birthdaysHint" },
						{ to: at("/levelling"), labelKey: "nav.levelling", icon: TrendingUp, hintKey: "nav.levellingHint" },
						{ to: at("/role-menus"), labelKey: "nav.roleMenus", icon: ListChecks, hintKey: "nav.roleMenusHint" },
						{ to: at("/ideas"), labelKey: "nav.ideas", icon: Lightbulb, hintKey: "nav.ideasHint" },
						{ to: at("/starboard"), labelKey: "nav.starboard", icon: Star, hintKey: "nav.starboardHint" },
						{ to: at("/temp-voice"), labelKey: "nav.tempVoice", icon: Volume2, hintKey: "nav.tempVoiceHint" },
					],
				},
				{
					labelKey: "nav.messages",
					icon: MessagesSquare,
					items: [
						{
							to: at("/announcements"),
							labelKey: "nav.announcements",
							icon: Megaphone,
							hintKey: "nav.announcementsHint",
						},
						{
							to: at("/scheduled-messages"),
							labelKey: "nav.scheduled",
							icon: CalendarClock,
							hintKey: "nav.scheduledHint",
						},
						{ to: at("/sticky"), labelKey: "nav.sticky", icon: Pin, hintKey: "nav.stickyHint" },
						{
							to: at("/auto-responders"),
							labelKey: "nav.autoResponders",
							icon: MessageSquareReply,
							hintKey: "nav.autoRespondersHint",
						},
					],
				},
				{
					labelKey: "nav.moderation",
					icon: Gavel,
					items: [
						{ to: at("/automod"), labelKey: "nav.automod", icon: ShieldAlert, hintKey: "nav.automodHint" },
						{ to: at("/raid-protection"), labelKey: "nav.raid", icon: Siren, hintKey: "nav.raidHint" },
						{ to: at("/warnings"), labelKey: "nav.warnings", icon: TriangleAlert, hintKey: "nav.warningsHint" },
						{ to: at("/cases"), labelKey: "nav.cases", icon: Gavel, hintKey: "nav.casesHint" },
						{ to: at("/bans"), labelKey: "nav.bans", icon: Ban, hintKey: "nav.bansHint" },
						{ to: at("/appeals"), labelKey: "nav.appeals", icon: Scale, hintKey: "nav.appealsHint" },
						{ to: at("/modmail"), labelKey: "nav.modmail", icon: Mails, hintKey: "nav.modmailHint" },
						{ to: at("/channel-tools"), labelKey: "nav.channelTools", icon: Lock, hintKey: "nav.channelToolsHint" },
						{ to: at("/tickets"), labelKey: "nav.tickets", icon: LifeBuoy, hintKey: "nav.ticketsHint" },
						{ to: at("/audit-log"), labelKey: "nav.auditLog", icon: ScrollText, hintKey: "nav.auditLogHint" },
						{ to: at("/changes"), labelKey: "nav.changes", icon: History, hintKey: "nav.changesHint" },
					],
				},
				{
					labelKey: "nav.stats",
					icon: ChartPie,
					items: [
						{ to: at("/insights"), labelKey: "nav.insights", icon: ChartLine, hintKey: "nav.insightsHint" },
						{ to: at("/invites"), labelKey: "nav.invites", icon: Mailbox, hintKey: "nav.invitesHint" },
						{
							to: at("/member-count"),
							labelKey: "nav.memberCount",
							icon: ChartColumn,
							hintKey: "nav.memberCountHint",
						},
						{ to: at("/bot-stats"), labelKey: "nav.botStats", icon: Gauge, hintKey: "nav.botStatsHint" },
					],
				},
				{
					labelKey: "nav.economy",
					icon: Coins,
					items: [
						{ to: at("/economy"), labelKey: "nav.economyRates", icon: Wallet, hintKey: "nav.economyRatesHint" },
						{ to: at("/treasure"), labelKey: "nav.treasure", icon: Gem, hintKey: "nav.treasureHint" },
						{ to: at("/lottery"), labelKey: "nav.lottery", icon: Ticket, hintKey: "nav.lotteryHint" },
						{ to: at("/casino"), labelKey: "nav.casino", icon: Dices, hintKey: "nav.casinoHint" },
					],
				},
				{
					labelKey: "nav.entertainment",
					icon: Sparkles,
					items: [
						{ to: at("/music"), labelKey: "nav.music", icon: Music, hintKey: "nav.musicHint" },
						{ to: at("/giveaways"), labelKey: "nav.giveaways", icon: Gift, hintKey: "nav.giveawaysHint" },
					],
				},
			],
		});
	}

	const own = groups.find((group) => guild !== undefined && group.guildId === guild.id);
	if (guild !== undefined && own !== undefined && mayGrant) {
		own.items.push({
			to: `/guilds/${guild.id}/access`,
			labelKey: "nav.access",
			icon: KeyRound,
			hintKey: "nav.accessHint",
		});
	}

	if (guild?.areas !== null && guild?.areas !== undefined) {
		const open = (item: NavItem): boolean => mayOpen(item.to, guild.id, guild.areas);
		for (const group of groups.filter((candidate) => candidate.guildId === guild.id)) {
			group.items = group.items.filter(open);
			group.sections = (group.sections ?? [])
				.map((section) => ({ ...section, items: section.items.filter(open) }))
				.filter((section) => section.items.length > 0);
		}
	}

	if (featuresOff !== undefined && featuresOff.size > 0) {
		const on = (item: NavItem): boolean => screenIsOff(featuresOff, item.to) === null;
		for (const group of groups) {
			group.items = group.items.filter(on);
			group.sections = (group.sections ?? [])
				.map((section) => ({ ...section, items: section.items.filter(on) }))
				.filter((section) => section.items.length > 0);
		}
	}

	if (isOwner) {
		groups.push({
			headingKey: "nav.bot",
			items: [{ to: "/owner", labelKey: "nav.owner", icon: ShieldCheck, hintKey: "nav.ownerHint" }],
		});
	}

	return groups;
}

export function allNavItems(groups: NavGroup[]): NavItem[] {
	return groups.flatMap((group) => [...group.items, ...(group.sections ?? []).flatMap((section) => section.items)]);
}

export function sectionHolds(section: NavSection, pathname: string): boolean {
	return section.items.some((item) => pathname === item.to || (item.exact === false && pathname.startsWith(item.to)));
}
