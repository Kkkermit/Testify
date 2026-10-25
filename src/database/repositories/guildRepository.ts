import { purgeAfk } from "@database/repositories/afkRepository";
import { purgeAntiLink } from "@database/repositories/antiLinkRepository";
import { purgeAuditLog } from "@database/repositories/auditLogRepository";
import { purgeAutoResponders } from "@database/repositories/autoResponderRepository";
import { purgeAutoRoles } from "@database/repositories/autoRoleRepository";
import { purgeFixedStats } from "@database/repositories/botStatsRepository";
import { purgeCasino } from "@database/repositories/casinoRepository";
import { purgeCasinoStats } from "@database/repositories/casinoStatsRepository";
import { purgeCommandToggles } from "@database/repositories/commandToggleRepository";
import { purgeCounting } from "@database/repositories/countingRepository";
import { purgeGoodbye } from "@database/repositories/goodbyeRepository";
import { purgeIdeas } from "@database/repositories/ideaRepository";
import { purgeWarnLadder } from "@database/repositories/moderationRepository";
import { purgeMusicSettings } from "@database/repositories/musicSettingsRepository";
import { purgePrefix } from "@database/repositories/prefixRepository";
import { purgeRoleMenus } from "@database/repositories/roleMenuRepository";
import { purgeRounds } from "@database/repositories/rouletteRepository";
import { purgeSchedules } from "@database/repositories/scheduledMessageRepository";
import { purgeStarboard } from "@database/repositories/starboardRepository";
import { purgeSticky } from "@database/repositories/stickyRepository";
import { purgeTempVoice } from "@database/repositories/tempVoiceRepository";
import { purgeTreasure } from "@database/repositories/treasureRepository";
import { purgeVoiceCounter } from "@database/repositories/voiceCounterRepository";
import { purgeWelcome } from "@database/repositories/welcomeRepository";

/** Deletes every per-guild document when the bot is removed from a server. */
export async function purgeGuild(guildId: string): Promise<void> {
	await Promise.all([
		purgeAfk(guildId),
		purgeAutoResponders(guildId),
		purgeSchedules(guildId),
		purgeAntiLink(guildId),
		purgeAuditLog(guildId),
		purgeAutoRoles(guildId),
		purgeCounting(guildId),
		purgeSticky(guildId),
		purgeWelcome(guildId),
		purgeGoodbye(guildId),
		purgeVoiceCounter(guildId),
		purgeFixedStats(guildId),
		purgeTreasure(guildId),
		purgePrefix(guildId),
		purgeCommandToggles(guildId),
		purgeMusicSettings(guildId),
		purgeRoleMenus(guildId),
		purgeIdeas(guildId),
		purgeStarboard(guildId),
		purgeTempVoice(guildId),
		purgeCasino(guildId),
		purgeCasinoStats(guildId),
		purgeRounds(guildId),
		purgeWarnLadder(guildId),
	]);
}
