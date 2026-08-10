import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type GuildOverview } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/** Takes null for the screens that serve both a server and the whole bot, so neither has to fake an id. */
export function useGuildOverview(guildId: string | null): UseQueryResult<GuildOverview> {
	return useQuery({
		queryKey: keys.guild(guildId ?? "").overview(),
		queryFn: () => api.get<GuildOverview>(`/guilds/${guildId ?? ""}/overview`),
		enabled: guildId !== null,
		staleTime: 30_000,
	});
}
