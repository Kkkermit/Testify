import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type BanPage, type UnbanBody } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useBans(guildId: string, options: { page: number; query: string }): UseQueryResult<BanPage> {
	const search = new URLSearchParams({
		page: String(options.page),
		...(options.query === "" ? {} : { q: options.query }),
	});

	return useQuery({
		queryKey: keys.guild(guildId).banPage(options.page, options.query),
		queryFn: () => api.get<BanPage>(`/guilds/${guildId}/bans?${search.toString()}`),
		placeholderData: keepPreviousData,
	});
}

/** Every page is read again afterwards, because the person lifted may have been on any of them. */
export function useUnban(guildId: string): UseMutationResult<BanPage, Error, { userId: string } & UnbanBody> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: ({ userId, ...body }) => api.post<BanPage>(`/guilds/${guildId}/bans/${userId}/unban`, body),
		onSettled: () => {
			void client.invalidateQueries({ queryKey: keys.guild(guildId).bans() });
		},
	});
}
