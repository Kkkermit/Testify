import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import {
	type AppealDecision,
	type AppealFilter,
	type AppealRow,
	type AppealSettings,
	type AppealSettingsPatch,
	type OwnAppeal,
	type OwnAppeals,
	type Paged,
} from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useAppealSettings(guildId: string): UseQueryResult<AppealSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).appealSettings(),
		queryFn: () => api.get<AppealSettings>(`/guilds/${guildId}/appeals/settings`),
	});
}

export function useSaveAppealSettings(guildId: string): UseMutationResult<AppealSettings, Error, AppealSettingsPatch> {
	return useDocumentMutation(
		keys.guild(guildId).appealSettings(),
		(patch) => api.patch<AppealSettings>(`/guilds/${guildId}/appeals/settings`, patch),
		[keys.guild(guildId).overview()],
	);
}

/** Reading appeals asks Ban Members, so a manager without it gets a refusal the page words rather than an empty list. */
export function useAppealList(guildId: string, status: AppealFilter, page: number): UseQueryResult<Paged<AppealRow>> {
	return useQuery({
		queryKey: keys.guild(guildId).appealList(status, page),
		queryFn: () => api.get<Paged<AppealRow>>(`/guilds/${guildId}/appeals?status=${status}&page=${String(page)}`),
		placeholderData: keepPreviousData,
	});
}

export function useDecideAppeal(
	guildId: string,
): UseMutationResult<AppealRow, Error, { appealId: string; decision: AppealDecision }> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: ({ appealId, decision }) =>
			api.post<AppealRow>(`/guilds/${guildId}/appeals/${appealId}/decision`, decision),
		onSettled: () => client.invalidateQueries({ queryKey: keys.guild(guildId).allAppeals() }),
	});
}

export function useOwnAppeals(): UseQueryResult<OwnAppeals> {
	return useQuery({ queryKey: keys.ownAppeals(), queryFn: () => api.get<OwnAppeals>("/appeals") });
}

export function useSendAppeal(): UseMutationResult<OwnAppeal, Error, { guildId: string; text: string }> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: ({ guildId, text }) => api.post<OwnAppeal>(`/appeals/${guildId}`, { text }),
		onSettled: () => client.invalidateQueries({ queryKey: keys.ownAppeals() }),
	});
}
