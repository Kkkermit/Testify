import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type GuildOverview } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useGuildOverview(guildId: string): UseQueryResult<GuildOverview> {
	return useQuery({
		queryKey: keys.guild(guildId).overview(),
		queryFn: () => api.get<GuildOverview>(`/guilds/${guildId}/overview`),
		staleTime: 30_000,
	});
}
