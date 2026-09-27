import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type ChangeSource, type ChangeWindow, type ServerChangesPage } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export interface ChangesFilter {
	days: ChangeWindow;
	source: ChangeSource;
	query: string;
	page: number;
}

export function useServerChanges(guildId: string, filter: ChangesFilter): UseQueryResult<ServerChangesPage> {
	const query = filter.query.trim();
	const search = new URLSearchParams({ days: String(filter.days), source: filter.source, page: String(filter.page) });
	if (query !== "") search.set("q", query);

	return useQuery({
		queryKey: keys.guild(guildId).changes(filter.days, filter.source, query, filter.page),
		queryFn: () => api.get<ServerChangesPage>(`/guilds/${guildId}/changes?${search.toString()}`),
		placeholderData: keepPreviousData,
	});
}
