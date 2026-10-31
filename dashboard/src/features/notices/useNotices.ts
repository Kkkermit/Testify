import {
	useMutation,
	type UseMutationResult,
	useQuery,
	useQueryClient,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type NoticeFeed } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/** Asked again every few minutes, so a tab left open still hears about a new notification. */
const NOTICE_REFRESH_MS = 5 * 60_000;

export function useNoticeFeed(): UseQueryResult<NoticeFeed> {
	return useQuery({
		queryKey: keys.notices(),
		queryFn: () => api.get<NoticeFeed>("/notices"),
		refetchInterval: NOTICE_REFRESH_MS,
	});
}

export function useMarkNoticesSeen(): UseMutationResult<NoticeFeed, Error, void> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: () => api.post<NoticeFeed>("/notices/seen", {}),
		onSuccess: (feed) => {
			client.setQueryData(keys.notices(), feed);
		},
	});
}
