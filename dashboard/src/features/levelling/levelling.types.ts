import { type ChannelSummary, type RoleSummary } from "@testify/shared";

export const TABS = [
	["general", "General"],
	["rewards", "Role rewards"],
	["boosts", "XP boosts"],
	["ignores", "Ignored"],
] as const;

export type Tab = (typeof TABS)[number][0];

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
