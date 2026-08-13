import {
	LayoutGrid,
	ScrollText,
	ShieldAlert,
	Server,
	ShieldCheck,
	Pin,
	SlidersHorizontal,
	Coins,
	Terminal,
	TrendingUp,
	Trophy,
	Users,
	UserPlus,
	MessagesSquare,
	LifeBuoy,
	Ticket,
	type LucideIcon,
	Gift,
} from "lucide-react";
import { type TranslationKey } from "@/i18n";

/** The sidebar as data: a new screen is one entry here and one route, and the rail, tooltips and active marker follow. */
export interface NavItem {
	to: string;
	/** A translation key, not text: this module is data and has no hook to translate with. */
	labelKey: TranslationKey;
	icon: LucideIcon;
	/** What the tooltip adds beyond the label. Omitted when the label already says everything. */
	hintKey?: TranslationKey;
	/** False when child routes should keep this item marked as current. */
	exact?: boolean;
}

/** A collapsible run of related screens, so a server's settings stay one scan rather than ten rows. */
export interface NavSection {
	labelKey: TranslationKey;
	icon: LucideIcon;
	items: NavItem[];
}

/** Groups put a server's own settings under its name, so it is always clear which server is being edited. */
export interface NavGroup {
	/** Absent for the first group, which needs no heading to be understood. A name, not a key, when present. */
	heading?: string;
	items: NavItem[];
	/** Rendered after `items`, each behind its own toggle. */
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
			],
		},
	];

	if (guild !== undefined) {
		groups.push({
			heading: guild.name,
			items: [
				{ to: `/guilds/${guild.id}`, labelKey: "nav.overview", icon: Server, hintKey: "nav.overviewHint" },
				{
					to: `/guilds/${guild.id}/settings`,
					labelKey: "nav.settings",
					icon: SlidersHorizontal,
					hintKey: "nav.settingsHint",
				},
			],
			sections: [
				{
					labelKey: "nav.members",
					icon: Users,
					items: [
						{
							to: `/guilds/${guild.id}/members`,
							labelKey: "nav.leaderboards",
							icon: Trophy,
							hintKey: "nav.leaderboardsHint",
							// A member's own page lives under this path, and it is still where you are in the sidebar.
							exact: false,
						},
						{
							to: `/guilds/${guild.id}/levelling`,
							labelKey: "nav.levelling",
							icon: TrendingUp,
							hintKey: "nav.levellingHint",
						},
						{
							to: `/guilds/${guild.id}/welcome`,
							labelKey: "nav.welcome",
							icon: UserPlus,
							hintKey: "nav.welcomeHint",
						},
					],
				},
				{
					labelKey: "nav.moderation",
					icon: ShieldAlert,
					items: [
						{
							to: `/guilds/${guild.id}/automod`,
							labelKey: "nav.automod",
							icon: ShieldAlert,
							hintKey: "nav.automodHint",
						},
						{
							to: `/guilds/${guild.id}/audit-log`,
							labelKey: "nav.auditLog",
							icon: ScrollText,
							hintKey: "nav.auditLogHint",
						},
					],
				},
				{
					labelKey: "nav.economy",
					icon: Coins,
					items: [
						{
							to: `/guilds/${guild.id}/treasure`,
							labelKey: "nav.treasure",
							icon: Coins,
							hintKey: "nav.treasureHint",
						},
						{
							to: `/guilds/${guild.id}/lottery`,
							labelKey: "nav.lottery",
							icon: Ticket,
							hintKey: "nav.lotteryHint",
						},
						{
							to: `/guilds/${guild.id}/giveaways`,
							labelKey: "nav.giveaways",
							icon: Gift,
							hintKey: "nav.giveawaysHint",
						},
					],
				},
				{
					labelKey: "nav.channels",
					icon: MessagesSquare,
					items: [
						{
							to: `/guilds/${guild.id}/sticky`,
							labelKey: "nav.sticky",
							icon: Pin,
							hintKey: "nav.stickyHint",
						},
						{
							to: `/guilds/${guild.id}/tickets`,
							labelKey: "nav.tickets",
							icon: LifeBuoy,
							hintKey: "nav.ticketsHint",
						},
					],
				},
			],
		});
	}

	if (isOwner) {
		groups.push({
			heading: "Bot",
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
