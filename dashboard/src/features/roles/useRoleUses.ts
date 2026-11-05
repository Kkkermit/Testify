import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type GuildRoleUses } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useRoleUses(guildId: string): UseQueryResult<GuildRoleUses> {
	return useQuery({
		queryKey: keys.guild(guildId).roleUses(),
		queryFn: () => api.get<GuildRoleUses>(`/guilds/${guildId}/role-uses`),
		staleTime: 30_000,
	});
}
