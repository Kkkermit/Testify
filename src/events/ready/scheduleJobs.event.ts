import { Events } from "discord.js";
import { INTERVALS } from "@config/constants";
import { defineEvent } from "@core/event";
import { announceBirthdays } from "@jobs/birthdays.util";
import { settleIdleHands } from "@jobs/casinoSweep.util";
import { runLotteryDraws } from "@jobs/lotteryDraw.util";
import { sweepMusicScratch } from "@jobs/musicScratchSweep.util";
import { payPassiveIncome } from "@jobs/passiveIncome.util";
import { refreshBotStats } from "@jobs/refreshBotStats.util";
import { deliverDueReminders } from "@jobs/reminders.util";
import { postDueSchedules } from "@jobs/scheduledMessages.util";
import { processExpiredSoftbans } from "@jobs/softbanExpiry.util";
import { recordHeartbeat } from "@jobs/statusHeartbeat.util";
import { sweepTempVoice } from "@jobs/tempVoiceSweep.util";
import { flushCommandLog, startEventLoopMonitor, watchDiscordApi } from "@lib/bot";
import { CASINO_TIMING, spinOverdueRounds } from "@lib/casino";
import { flushActivity } from "@lib/info";
import { STATUS_LIMITS } from "@testify/shared";

/** Starts the repeating background jobs. */
export default defineEvent({
	name: Events.ClientReady,
	once: true,
	run(client) {
		client.timers.every("lottery", INTERVALS.lotteryCheckMs, () => runLotteryDraws(client));
		client.timers.every("softbans", INTERVALS.softbanCheckMs, () => processExpiredSoftbans(client));
		client.timers.every("reminders", INTERVALS.reminderCheckMs, () => deliverDueReminders(client));
		client.timers.every("scheduled-messages", INTERVALS.scheduledMessageCheckMs, () => postDueSchedules(client));
		client.timers.after("birthdays-first", 2 * 60_000, () => announceBirthdays(client));
		client.timers.every("birthdays", INTERVALS.birthdayCheckMs, () => announceBirthdays(client));
		client.timers.every("passive-income", INTERVALS.passiveIncomeMs, () => payPassiveIncome(client));
		client.timers.every("bot-stats", INTERVALS.fixedStatsRefreshMs, () => refreshBotStats(client));
		client.timers.every("insights", INTERVALS.insightsFlushMs, () => flushActivity(client.logger));
		client.timers.every("casino-hands", CASINO_TIMING.sweepEveryMs, () => settleIdleHands(client));
		client.timers.every("roulette-rounds", CASINO_TIMING.sweepEveryMs, () => spinOverdueRounds(client));
		client.timers.every("command-log", INTERVALS.commandLogFlushMs, () => flushCommandLog(client));
		// Once soon after start-up for what emptied while the bot was away, then as a backstop.
		client.timers.after("temp-voice-first", 30_000, () => sweepTempVoice(client));
		client.timers.every("temp-voice", INTERVALS.tempVoiceSweepMs, () => sweepTempVoice(client));
		// Once, because only a run that died mid-track leaves a download folder behind.
		client.timers.after("music-scratch", 30_000, () => sweepMusicScratch(client));

		startEventLoopMonitor();
		watchDiscordApi(client);
		// The first heartbeat waits a minute so the gateway ping it records is a real one.
		client.timers.after("status-first", 60_000, () => recordHeartbeat(client));
		client.timers.every("status", STATUS_LIMITS.sampleEveryMs, () => recordHeartbeat(client));

		client.logger.debug({ jobs: client.timers.names() }, "Background jobs scheduled");
	},
});
