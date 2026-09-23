import { Events } from "discord.js";
import { INTERVALS } from "@config/constants";
import { defineEvent } from "@core/event";
import { runLotteryDraws } from "@jobs/lotteryDraw.util";
import { payPassiveIncome } from "@jobs/passiveIncome.util";
import { refreshBotStats } from "@jobs/refreshBotStats.util";
import { processExpiredSoftbans } from "@jobs/softbanExpiry.util";
import { recordHeartbeat } from "@jobs/statusHeartbeat.util";
import { startEventLoopMonitor, watchDiscordApi } from "@lib/bot";
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

		startEventLoopMonitor();
		watchDiscordApi(client);
		// The first heartbeat waits a minute so the gateway ping it records is a real one.
		client.timers.after("status-first", 60_000, () => recordHeartbeat(client));
		client.timers.every("status", STATUS_LIMITS.sampleEveryMs, () => recordHeartbeat(client));

		client.logger.debug({ jobs: client.timers.names() }, "Background jobs scheduled");
	},
});
