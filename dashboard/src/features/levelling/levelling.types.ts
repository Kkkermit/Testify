import { type ChannelSummary, type RoleSummary } from "@testify/shared";
import { EyeOff, Gift, Settings2, Zap } from "lucide-react";
import { type TabDefinition } from "@/components/primitives";

export const TABS = [
	{ key: "general", label: "levelling.tabGeneral", icon: Settings2 },
	{ key: "rewards", label: "levelling.tabRewards", icon: Gift },
	{ key: "boosts", label: "levelling.tabBoosts", icon: Zap },
	{ key: "ignores", label: "levelling.tabIgnores", icon: EyeOff },
] as const satisfies readonly TabDefinition[];

export type Tab = (typeof TABS)[number]["key"];

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
