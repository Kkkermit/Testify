import { useMutation, type UseMutationResult, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type SupportCatalogueEntry, type SupportIndex, type SupportReply, SupportSearch } from "@testify/shared";
import { useMemo } from "react";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/** The articles never change while the bot runs, so one read lasts the session. */
export function useSupportIndex(): UseQueryResult<SupportIndex> {
	return useQuery({ queryKey: keys.support(), queryFn: () => api.get<SupportIndex>("/support"), staleTime: Infinity });
}

/** The same search the bot answers with, run in the browser, so a suggestion appears on every keystroke without a request. */
export function useSupportSearch(): {
	entries: SupportCatalogueEntry[];
	search: SupportSearch<SupportCatalogueEntry> | null;
} {
	const index = useSupportIndex();

	return useMemo(() => {
		const entries = index.data?.articles ?? [];
		return { entries, search: entries.length === 0 ? null : new SupportSearch(entries) };
	}, [index.data]);
}

export function useSupportArticle(id: string | null): UseQueryResult<SupportReply> {
	return useQuery({
		queryKey: keys.supportArticle(id ?? ""),
		queryFn: () => api.get<SupportReply>(`/support/articles/${encodeURIComponent(id ?? "")}`),
		enabled: id !== null,
		staleTime: Infinity,
	});
}

export function useAskSupport(): UseMutationResult<SupportReply, Error, string> {
	return useMutation({ mutationFn: (question: string) => api.post<SupportReply>("/support/ask", { question }) });
}
