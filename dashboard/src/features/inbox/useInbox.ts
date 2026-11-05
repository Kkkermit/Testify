import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type GuildInbox } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useInbox(guildId: string | null): UseQueryResult<GuildInbox> {
	return useQuery({
		queryKey: keys.guild(guildId ?? "").inbox(),
		queryFn: () => api.get<GuildInbox>(`/guilds/${guildId ?? ""}/inbox`),
		enabled: guildId !== null,
		staleTime: 30_000,
	});
}
