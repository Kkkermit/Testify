import { type XpBoost, type LevelReward } from "@database/models/guildSettings.schema";
import { type LEVEL_TABS } from "@lib/levelling/levelling.constants";

/** The types more than one module in this domain shares. */

/** Level settings with every optional field resolved. */
export interface LevelConfig {
	enabled: boolean;
	boosts: XpBoost[];
	rewards: LevelReward[];
	stackRewards: boolean;
	/** `null` means "reply wherever the message was sent". */
	levelUpChannelId: string | null;
	announce: boolean;
	ignoredChannelIds: string[];
	ignoredRoleIds: string[];
}

export interface RewardOutcome {
	added: string[];
	removed: string[];
	/** Roles that could not be touched — deleted, managed, or above the bot. */
	skipped: string[];
}

export type LevelTab = (typeof LEVEL_TABS)[number];

export interface LevelPanelState {
	tab: LevelTab;
	config: LevelConfig;
	/** A one-line result from the last press, shown above the controls. */
	note?: string;
}
