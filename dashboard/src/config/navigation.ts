import {
	Activity,
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
	Ticket,
	type LucideIcon,
	Gauge,
	Hash,
	Gavel,
	History,
	Inbox,
	Gift,
	Gem,
	Sparkles,
	Star,
	Volume2,
} from "lucide-react";
import { type TranslationKey } from "@/i18n";

/** The sidebar as data: a new screen is one entry here and one route, and the rail, tooltips, search and active marker follow. */
export interface NavItem {
	to: string;
	/** A translation key, not text: this module is data and has no hook to translate with. */
	labelKey: TranslationKey;
	icon: LucideIcon;
	/** What the tooltip adds beyond the label. Omitted when the label already says everything. */
	hintKey?: TranslationKey;
	/** False when child routes should keep this item marked as current. */
	exact?: boolean;
	/** A live count drawn beside the label: what is waiting in this server's inbox. */
	badge?: { kind: "inbox"; guildId: string };
}

/** A collapsible run of related screens, so a server's settings stay one scan rather than ten rows. */
export interface NavSection {
	labelKey: TranslationKey;
	icon: LucideIcon;
	items: NavItem[];
}

/** Groups put a server's own screens under its name, so it is always clear which server is being edited. */
export interface NavGroup {
	/** A server's own name, shown exactly as typed. Absent for the first group, which needs no heading. */
	heading?: string;
	/** For a group that is not named after a server, so its heading is translated rather than a name. */
	headingKey?: TranslationKey;
	/** Set on a server's own group, whose heading is the switcher to the same screen in another server. */
	guildId?: string;
	items: NavItem[];
	/** Rendered last, each behind its own toggle. */
	sections?: NavSection[];
}

export interface NavAudience {
	guild: { id: string; name: string } | undefined;
	isOwner: boolean;
}

export function navigationFor({ guild, isOwner }: NavAudience): NavGroup[] {
	const groups: NavGroup[] = [
		{
			items: [
				{ to: "/guilds", labelKey: "nav.servers", icon: LayoutGrid, hintKey: "nav.serversHint" },
				{
					to: guild === undefined ? "/commands" : `/guilds/${guild.id}/commands`,
					labelKey: "nav.commands",
					icon: Terminal,
					hintKey: guild === undefined ? "nav.commandsHintAll" : "nav.commandsHintGuild",
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
				// One channel's page lives under this path, so Channels stays marked while it is open.
				{ to: at("/channels"), labelKey: "nav.channels", icon: Hash, hintKey: "nav.channelsHint", exact: false },
				// A member's own page lives under this path, and it is still where you are in the sidebar.
				{ to: at("/members"), labelKey: "nav.members", icon: Users, hintKey: "nav.membersHint", exact: false },
				// A role's own page lives under this path too.
				{ to: at("/roles"), labelKey: "nav.roles", icon: Shield, hintKey: "nav.rolesHint", exact: false },
				{ to: at("/settings"), labelKey: "nav.settings", icon: SlidersHorizontal, hintKey: "nav.settingsHint" },
			],
			// Each section holds only the screens it names, so a feature is found where its purpose says it is.
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

/** Open on arrival when the current page is inside it, so a collapsed section never hides where you are. */
export function sectionHolds(section: NavSection, pathname: string): boolean {
	return section.items.some((item) => pathname === item.to || (item.exact === false && pathname.startsWith(item.to)));
}
