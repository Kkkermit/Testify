import { Events } from "discord.js";
import { INTERVALS } from "@config/constants";
import { defineEvent } from "@core/event";
import { runLotteryDraws } from "@jobs/lotteryDraw.util";
import { payPassiveIncome } from "@jobs/passiveIncome.util";
import { refreshBotStats } from "@jobs/refreshBotStats.util";
import { processExpiredSoftbans } from "@jobs/softbanExpiry.util";

/** Starts the repeating background jobs. */
export default defineEvent({
	name: Events.ClientReady,
	once: true,
	run(client) {
		client.timers.every("lottery", INTERVALS.lotteryCheckMs, () => runLotteryDraws(client));
		client.timers.every("softbans", INTERVALS.softbanCheckMs, () => processExpiredSoftbans(client));
		client.timers.every("passive-income", INTERVALS.passiveIncomeMs, () => payPassiveIncome(client));
		client.timers.every("bot-stats", INTERVALS.fixedStatsRefreshMs, () => refreshBotStats(client));

		client.logger.debug({ jobs: client.timers.names() }, "Background jobs scheduled");
	},
});
