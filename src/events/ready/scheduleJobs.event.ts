import { Events } from "discord.js";
import { INTERVALS } from "@config/constants";
import { defineEvent } from "@core/event";
import { settleIdleHands } from "@jobs/casinoSweep.util";
import { runLotteryDraws } from "@jobs/lotteryDraw.util";
import { payPassiveIncome } from "@jobs/passiveIncome.util";
import { refreshBotStats } from "@jobs/refreshBotStats.util";
import { processExpiredSoftbans } from "@jobs/softbanExpiry.util";
import { recordHeartbeat } from "@jobs/statusHeartbeat.util";
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
		client.timers.every("passive-income", INTERVALS.passiveIncomeMs, () => payPassiveIncome(client));
		client.timers.every("bot-stats", INTERVALS.fixedStatsRefreshMs, () => refreshBotStats(client));
		client.timers.every("insights", INTERVALS.insightsFlushMs, () => flushActivity(client.logger));
		client.timers.every("casino-hands", CASINO_TIMING.sweepEveryMs, () => settleIdleHands(client));
		client.timers.every("roulette-rounds", CASINO_TIMING.sweepEveryMs, () => spinOverdueRounds(client));
		client.timers.every("command-log", INTERVALS.commandLogFlushMs, () => flushCommandLog(client));

		startEventLoopMonitor();
		watchDiscordApi(client);
		// The first heartbeat waits a minute so the gateway ping it records is a real one.
		client.timers.after("status-first", 60_000, () => recordHeartbeat(client));
		client.timers.every("status", STATUS_LIMITS.sampleEveryMs, () => recordHeartbeat(client));

		client.logger.debug({ jobs: client.timers.names() }, "Background jobs scheduled");
	},
});
