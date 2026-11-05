import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type GuildWeek } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useWeek(guildId: string): UseQueryResult<GuildWeek> {
	return useQuery({
		queryKey: keys.guild(guildId).week(),
		queryFn: () => api.get<GuildWeek>(`/guilds/${guildId}/week`),
		staleTime: 30_000,
	});
}
