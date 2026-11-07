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
import { giveaways } from "@lib/giveaways";
import { flushActivity } from "@lib/info";
import { partIsOff, STATUS_LIMITS } from "@testify/shared";

export default defineEvent({
	name: Events.ClientReady,
	once: true,
	run(client) {
		// A job a switched-off feature owns is never scheduled.
		const on = (name: string): boolean => !partIsOff(client.featuresOff, "jobs", name);
		const every = (name: string, ms: number, task: () => Promise<void> | void): void => {
			if (on(name)) client.timers.every(name, ms, task);
		};
		const after = (name: string, ms: number, task: () => Promise<void> | void): void => {
			if (on(name)) client.timers.after(name, ms, task);
		};

		every("lottery", INTERVALS.lotteryCheckMs, () => runLotteryDraws(client));
		every("softbans", INTERVALS.softbanCheckMs, () => processExpiredSoftbans(client));
		every("reminders", INTERVALS.reminderCheckMs, () => deliverDueReminders(client));
		every("scheduled-messages", INTERVALS.scheduledMessageCheckMs, () => postDueSchedules(client));
		after("birthdays-first", 2 * 60_000, () => announceBirthdays(client));
		every("birthdays", INTERVALS.birthdayCheckMs, () => announceBirthdays(client));
		every("passive-income", INTERVALS.passiveIncomeMs, () => payPassiveIncome(client));
		every("bot-stats", INTERVALS.fixedStatsRefreshMs, () => refreshBotStats(client));
		every("insights", INTERVALS.insightsFlushMs, () => flushActivity(client.logger));
		every("casino-hands", CASINO_TIMING.sweepEveryMs, () => settleIdleHands(client));
		every("roulette-rounds", CASINO_TIMING.sweepEveryMs, () => spinOverdueRounds(client));
		every("command-log", INTERVALS.commandLogFlushMs, () => flushCommandLog(client));
		// Once soon after start-up for what emptied while the bot was away, then as a backstop.
		after("temp-voice-first", 30_000, () => sweepTempVoice(client));
		every("temp-voice", INTERVALS.tempVoiceSweepMs, () => sweepTempVoice(client));
		// Once, because only a run that died mid-track leaves a download folder behind.
		after("music-scratch", 30_000, () => sweepMusicScratch(client));
		// The manager ends giveaways on its own timer, which only starts once something creates it.
		after("giveaways", 5_000, () => {
			giveaways(client);
		});

		startEventLoopMonitor();
		watchDiscordApi(client);
		// The first heartbeat waits a minute so the gateway ping it records is a real one.
		after("status-first", 60_000, () => recordHeartbeat(client));
		every("status", STATUS_LIMITS.sampleEveryMs, () => recordHeartbeat(client));

		client.logger.debug({ jobs: client.timers.names() }, "[JOBS] Scheduled the background jobs.");
	},
});
