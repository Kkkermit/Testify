import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type GuildPlaces } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function usePlaces(guildId: string): UseQueryResult<GuildPlaces> {
	return useQuery({
		queryKey: keys.guild(guildId).places(),
		queryFn: () => api.get<GuildPlaces>(`/guilds/${guildId}/places`),
		staleTime: 30_000,
	});
}
