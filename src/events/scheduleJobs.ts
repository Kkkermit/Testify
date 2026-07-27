import { Events } from "discord.js";
import { INTERVALS } from "@config/constants";
import { defineEvent } from "@core/event";
import { runLotteryDraws } from "@jobs/lotteryDraw";
import { payPassiveIncome } from "@jobs/passiveIncome";
import { refreshBotStats } from "@jobs/refreshBotStats";
import { processExpiredSoftbans } from "@jobs/softbanExpiry";

/** Starts the repeating background jobs. Add a new one by adding a line here. */
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
