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
	Users,
	UserPlus,
	MessagesSquare,
	LifeBuoy,
	type LucideIcon,
} from "lucide-react";

/** The sidebar as data: a new screen is one entry here and one route, and the rail, tooltips and active marker follow. */
export interface NavItem {
	to: string;
	label: string;
	icon: LucideIcon;
	/** What the tooltip adds beyond the label. Omitted when the label already says everything. */
	hint?: string;
	/** False when child routes should keep this item marked as current. */
	exact?: boolean;
}

/** A collapsible run of related screens, so a server's settings stay one scan rather than ten rows. */
export interface NavSection {
	label: string;
	icon: LucideIcon;
	items: NavItem[];
}

/** Groups put a server's own settings under its name, so it is always clear which server is being edited. */
export interface NavGroup {
	/** Absent for the first group, which needs no heading to be understood. */
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
				{ to: "/guilds", label: "Servers", icon: LayoutGrid, hint: "Every server you can configure" },
				{
					to: guild === undefined ? "/commands" : `/guilds/${guild.id}/commands`,
					label: "Commands",
					icon: Terminal,
					hint:
						guild === undefined
							? "Every command Testify has"
							: "Every command Testify has, and which of them this server allows",
				},
			],
		},
	];

	if (guild !== undefined) {
		groups.push({
			heading: guild.name,
			items: [
				{ to: `/guilds/${guild.id}`, label: "Overview", icon: Server, hint: "This server at a glance" },
				{
					to: `/guilds/${guild.id}/settings`,
					label: "Settings",
					icon: SlidersHorizontal,
					hint: "Prefix, link filtering, joins and counting",
				},
			],
			sections: [
				{
					label: "Members",
					icon: Users,
					items: [
						{
							to: `/guilds/${guild.id}/levelling`,
							label: "Levelling",
							icon: TrendingUp,
							hint: "XP, rewards and boosts",
						},
						{
							to: `/guilds/${guild.id}/welcome`,
							label: "Welcome",
							icon: UserPlus,
							hint: "What Testify says when somebody joins",
						},
					],
				},
				{
					label: "Moderation",
					icon: ShieldAlert,
					items: [
						{
							to: `/guilds/${guild.id}/automod`,
							label: "AutoMod",
							icon: ShieldAlert,
							hint: "Discord's own message filters",
						},
						{
							to: `/guilds/${guild.id}/audit-log`,
							label: "Audit log",
							icon: ScrollText,
							hint: "Which server events Testify records",
						},
					],
				},
				{
					label: "Messages",
					icon: MessagesSquare,
					items: [
						{
							to: `/guilds/${guild.id}/sticky`,
							label: "Sticky",
							icon: Pin,
							hint: "Messages Testify keeps at the bottom of a channel",
						},
						{
							to: `/guilds/${guild.id}/treasure`,
							label: "Treasure",
							icon: Coins,
							hint: "Random money drops in chat",
						},
						{
							to: `/guilds/${guild.id}/tickets`,
							label: "Tickets",
							icon: LifeBuoy,
							hint: "A button members press to reach your staff",
						},
					],
				},
			],
		});
	}

	if (isOwner) {
		groups.push({
			heading: "Bot",
			items: [{ to: "/owner", label: "Owner console", icon: ShieldCheck, hint: "Every server Testify is in" }],
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
