import { useMutation, type UseMutationResult, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type SupportArticle, type SupportIndex, type SupportReply } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/** The articles never change while the bot runs, so one read lasts the session. */
export function useSupportIndex(): UseQueryResult<SupportIndex> {
	return useQuery({ queryKey: keys.support(), queryFn: () => api.get<SupportIndex>("/support"), staleTime: Infinity });
}

export function useSupportArticle(id: string | null): UseQueryResult<SupportArticle> {
	return useQuery({
		queryKey: keys.supportArticle(id ?? ""),
		queryFn: () => api.get<SupportArticle>(`/support/articles/${encodeURIComponent(id ?? "")}`),
		enabled: id !== null,
		staleTime: Infinity,
	});
}

export function useAskSupport(): UseMutationResult<SupportReply, Error, string> {
	return useMutation({ mutationFn: (question: string) => api.post<SupportReply>("/support/ask", { question }) });
}
