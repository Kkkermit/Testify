import { Events } from "discord.js";
import { INTERVALS } from "../../../config/constants";
import { type TestifyClient } from "../../../core/client";
import { defineEvent } from "../../../core/event";
import { runLotteryDraws } from "../../../jobs/lotteryDraw";
import { payPassiveIncome } from "../../../jobs/passiveIncome";
import { refreshBotStats } from "../../../jobs/refreshBotStats";
import { processExpiredSoftbans } from "../../../jobs/softbanExpiry";
import { pollInstagram } from "../../../jobs/instagramPoll";

/**
 * `once: true`, and every timer is registered so shutdown clears it. The
 * previous ready handlers were not `once`, so a gateway re-identify stacked an
 * entire extra set of intervals each time.
 */
export default defineEvent({
	name: Events.ClientReady,
	once: true,
	execute(client: TestifyClient) {
		client.timers.guardedInterval("job:lottery", INTERVALS.lotteryCheckMs, () => runLotteryDraws(client));
		client.timers.guardedInterval("job:softbans", INTERVALS.softbanCheckMs, () => processExpiredSoftbans(client));
		client.timers.guardedInterval("job:passiveIncome", INTERVALS.passiveIncomeMs, () => payPassiveIncome(client));
		client.timers.guardedInterval("job:botStats", INTERVALS.fixedStatsRefreshMs, () => refreshBotStats(client));
		client.timers.guardedInterval("job:instagram", INTERVALS.instagramPollMs, () => pollInstagram(client));

		client.logger.info({ timers: client.timers.names() }, "Background jobs scheduled");
	},
});
