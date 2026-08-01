import { LayoutGrid, Server, ShieldCheck, Terminal, TrendingUp, Users, type LucideIcon } from "lucide-react";

/**
 * The sidebar, as data. A new settings screen is one entry here and one route — nothing in the shell needs
 * touching, and the icon-only width, the tooltips and the active marker all follow automatically.
 */
export interface NavItem {
	to: string;
	label: string;
	icon: LucideIcon;
	/** What the tooltip adds beyond the label. Omitted when the label already says everything. */
	hint?: string;
	/** False when child routes should keep this item marked as current. */
	exact?: boolean;
}

/**
 * Groups keep the list readable as screens are added, and put the server's own settings under its name so it is
 * always clear which server is being edited.
 */
export interface NavGroup {
	/** Absent for the first group, which needs no heading to be understood. */
	heading?: string;
	items: NavItem[];
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
					hint: "Every command Testify has",
				},
			],
		},
	];

	if (guild !== undefined) {
		groups.push({
			heading: guild.name,
			items: [
				{ to: `/guilds/${guild.id}`, label: "Overview", icon: Server, hint: "This server at a glance" },
				{ to: `/guilds/${guild.id}/levelling`, label: "Levelling", icon: TrendingUp, hint: "XP, rewards and boosts" },
				{
					to: `/guilds/${guild.id}/welcome`,
					label: "Welcome",
					icon: Users,
					hint: "What Testify says when somebody joins",
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
	return groups.flatMap((group) => group.items);
}
