import { type ChannelSummary, type RoleSummary } from "@testify/shared";
import { EyeOff, Gift, Settings2, Zap, type LucideIcon } from "lucide-react";

export interface TabDefinition {
	key: string;
	label: string;
	icon: LucideIcon;
}

/** Adding a tab is an entry here and a branch in the page; the tab bar and the URL handling follow. */
export const TABS = [
	{ key: "general", label: "General", icon: Settings2 },
	{ key: "rewards", label: "Role rewards", icon: Gift },
	{ key: "boosts", label: "XP boosts", icon: Zap },
	{ key: "ignores", label: "Ignored", icon: EyeOff },
] as const satisfies readonly TabDefinition[];

export type Tab = (typeof TABS)[number]["key"];

/** Every tab is handed the guild it is editing and the lists it needs, and fetches nothing itself. */
export interface TabProps {
	guildId: string;
	channels: ChannelSummary[];
	roles: RoleSummary[];
}

export interface GeneralSettings {
	enabled: boolean;
	announce: boolean;
	stackRewards: boolean;
	levelUpChannelId: string | null;
}
