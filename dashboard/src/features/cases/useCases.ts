import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type CaseAction, type CasePage, type CasePatch, type CaseSettings } from "@testify/shared";
import { caseSearch } from "@/features/cases/cases.utils";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useCases(
	guildId: string,
	options: { page: number; query: string; action: CaseAction | null },
): UseQueryResult<CasePage> {
	return useQuery({
		queryKey: keys.guild(guildId).cases(options.page, options.query, options.action ?? "all"),
		queryFn: () => api.get<CasePage>(`/guilds/${guildId}/cases${caseSearch(options)}`),
		placeholderData: keepPreviousData,
	});
}

export function useCaseSettings(guildId: string): UseQueryResult<CaseSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).caseSettings(),
		queryFn: () => api.get<CaseSettings>(`/guilds/${guildId}/cases/settings`),
	});
}

export function useUpdateCaseSettings(guildId: string): UseMutationResult<CaseSettings, Error, CasePatch> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (patch: CasePatch) => api.put<CaseSettings>(`/guilds/${guildId}/cases/settings`, patch),
		onSuccess: (settings) => {
			client.setQueryData(keys.guild(guildId).caseSettings(), settings);
			void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
		},
	});
}
