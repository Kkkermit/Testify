import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type MemberCounts } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useMemberCount(guildId: string): UseQueryResult<MemberCounts> {
	return useQuery({
		queryKey: keys.guild(guildId).memberCount(),
		queryFn: () => api.get<MemberCounts>(`/guilds/${guildId}/member-count`),
	});
}
