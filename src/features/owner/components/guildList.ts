import { Namespace } from "../../../core/customId";
import { createPaginationHandler } from "../../../ui/pagination";
import { GUILD_PAGE_SIZE, type GuildSummary, guildSummaries, renderGuildPage } from "../commands/guildList";

export default createPaginationHandler<GuildSummary>({
	namespace: Namespace.GuildList,
	pageSize: GUILD_PAGE_SIZE,
	resolve: (_key, context) => Promise.resolve(guildSummaries(context.client)),
	render: renderGuildPage,
});
