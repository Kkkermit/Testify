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

export interface NavAudience {
	guild: { id: string; name: string } | undefined;
	isOwner: boolean;
}

export function navigationFor({ guild, isOwner }: NavAudience): NavItem[] {
	const items: NavItem[] = [
		{ to: "/guilds", label: "Servers", icon: LayoutGrid, hint: "Every server you can configure" },
	];

	if (guild !== undefined) {
		items.push(
			{ to: `/guilds/${guild.id}`, label: guild.name, icon: Server, hint: "This server at a glance", exact: false },
			{ to: `/guilds/${guild.id}/levelling`, label: "Levelling", icon: TrendingUp, hint: "XP, rewards and boosts" },
			{
				to: `/guilds/${guild.id}/welcome`,
				label: "Welcome",
				icon: Users,
				hint: "What Testify says when somebody joins",
			},
		);
	}

	items.push({
		to: guild === undefined ? "/commands" : `/guilds/${guild.id}/commands`,
		label: "Commands",
		icon: Terminal,
		hint: "Every command Testify has",
	});

	if (isOwner) items.push({ to: "/owner", label: "Owner", icon: ShieldCheck, hint: "Every server Testify is in" });

	return items;
}
