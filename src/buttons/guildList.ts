import { GUILD_PAGE_SIZE, guildSummaries, type GuildSummary, renderGuildPage } from "../commands/owner/guildList";
import { paginatedButton } from "../lib/pagination";

export default paginatedButton<GuildSummary>({
	id: "guilds",
	pageSize: GUILD_PAGE_SIZE,
	resolve: (_key, context) => Promise.resolve(guildSummaries(context.client)),
	render: renderGuildPage,
});
