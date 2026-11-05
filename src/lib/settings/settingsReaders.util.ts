import { type Guild } from "discord.js";
import { getAntiLink } from "@database/repositories/antiLinkRepository";
import { getAutoRoles } from "@database/repositories/autoRoleRepository";
import { getCounting } from "@database/repositories/countingRepository";
import { getLevelSettings } from "@database/repositories/levelRepository";
import { getPrefixConfig } from "@database/repositories/prefixRepository";
import { getVerifyConfig } from "@database/repositories/verificationRepository";
import { getVoiceCounter } from "@database/repositories/voiceCounterRepository";
import { getWelcome } from "@database/repositories/welcomeRepository";
import { readBirthdayOverview } from "@lib/birthdays/birthdayActions.util";
import { readLottery } from "@lib/economy/lotteryActions.util";
import { readTreasure } from "@lib/economy/treasureActions.util";
import { readIdeaSettings } from "@lib/ideas/ideaActions.util";
import { normaliseSettings } from "@lib/levelling/levelling.util";
import { readCaseSettings } from "@lib/moderation/caseActions.util";
import { readMusicSettings } from "@lib/music/musicSettings.util";
import { readRaidOverview } from "@lib/raid/raidActions.util";
import { type VerifyConfig } from "@lib/settings/settings.types";
import { roleTooHigh } from "@lib/settings/verifyActions.util";
import { normaliseVerify } from "@lib/settings/verifyPanel.util";
import { readStarboardSettings } from "@lib/starboard/starboardActions.util";
import { readTempVoiceSettings } from "@lib/tempVoice/tempVoiceActions.util";
import { readGoodbye } from "@lib/welcome/goodbyeActions.util";
import { normaliseWelcome } from "@lib/welcome/welcome.util";
import {
	DEFAULT_BYPASS,
	DEFAULT_WELCOME_MESSAGE,
	isBypassPermission,
	type LevelConfigResponse,
	type RestorableAction,
	type ServerSettings,
	SETTINGS_LIMITS,
	type VerificationConfigResponse,
	type WelcomeConfigResponse,
} from "@testify/shared";

/** No record means off, so an absent one becomes a disabled config with defaults; `normaliseWelcome` migrates old ones. */
export async function readWelcomeConfig(guildId: string): Promise<WelcomeConfigResponse> {
	const stored = normaliseWelcome(await getWelcome(guildId));
	if (stored === null) {
		return { enabled: false, channelId: null, message: DEFAULT_WELCOME_MESSAGE, style: "card", hasBackground: false };
	}

	return { enabled: true, ...stored };
}

export async function readLevelConfig(guildId: string): Promise<LevelConfigResponse> {
	return normaliseSettings(await getLevelSettings(guildId));
}

function verificationBody(guild: Guild, stored: VerifyConfig, exists: boolean): VerificationConfigResponse {
	return {
		enabled: exists,
		channelId: stored.channelId,
		roleId: stored.roleId,
		message: stored.message,
		posted: stored.messageId !== null,
		verifiedCount: stored.verifiedCount,
		roleTooHigh: roleTooHigh(guild, stored.roleId),
	};
}

export async function readVerificationConfig(guild: Guild): Promise<VerificationConfigResponse> {
	const record = await getVerifyConfig(guild.id);
	return verificationBody(guild, normaliseVerify(record), record !== null);
}

/** The settings page's five sections, read together as the page shows them. */
export async function readServerSettings(guildId: string): Promise<ServerSettings> {
	const [prefix, antiLink, autoRoles, counting, voice] = await Promise.all([
		getPrefixConfig(guildId),
		getAntiLink(guildId),
		getAutoRoles(guildId),
		getCounting(guildId),
		getVoiceCounter(guildId),
	]);

	return {
		prefix: { prefix: prefix.prefix, enabled: prefix.isEnabled },
		antiLink: {
			// No record means off, and the stored flag is normalised so an old value cannot reach the form.
			enabled: antiLink !== null,
			bypassPermission:
				antiLink !== null && isBypassPermission(antiLink.bypassPermission) ? antiLink.bypassPermission : DEFAULT_BYPASS,
		},
		autoRoles: { roleIds: autoRoles?.roleIds ?? [] },
		counting: {
			enabled: counting !== null,
			channelId: counting?.channelId ?? null,
			maxCount: counting?.maxCount ?? SETTINGS_LIMITS.maxCount,
			count: counting?.count ?? 0,
		},
		voiceStats: {
			memberChannelId: voice?.memberChannelId ?? null,
			botChannelId: voice?.botChannelId ?? null,
		},
	};
}

/** What each restorable setting's dashboard route answers with, so a change recorded from Discord has the same shape. */
export const SETTING_READERS: Record<RestorableAction, (guild: Guild) => Promise<unknown>> = {
	"welcome.update": async (guild) => readWelcomeConfig(guild.id),
	"goodbye.update": readGoodbye,
	"birthdays.update": readBirthdayOverview,
	"levelling.update": async (guild) => readLevelConfig(guild.id),
	"starboard.update": readStarboardSettings,
	"ideas.update": readIdeaSettings,
	"temp-voice.update": readTempVoiceSettings,
	"raid.update": readRaidOverview,
	"cases.settings": readCaseSettings,
	"verification.update": readVerificationConfig,
	"music.update": async (guild) => readMusicSettings(guild.id),
	"treasure.update": async (guild) => readTreasure(guild.id),
	"lottery.update": async (guild) => readLottery(guild.id),
	"settings.prefix": async (guild) => readServerSettings(guild.id),
	"settings.anti-link": async (guild) => readServerSettings(guild.id),
	"settings.auto-roles": async (guild) => readServerSettings(guild.id),
	"settings.counting": async (guild) => readServerSettings(guild.id),
	"settings.voice-stats": async (guild) => readServerSettings(guild.id),
};
