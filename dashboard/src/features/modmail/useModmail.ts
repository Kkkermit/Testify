import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import {
	type ModmailConversation,
	type ModmailConversations,
	type ModmailSettings,
	type ModmailSettingsPatch,
} from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useModmailSettings(guildId: string): UseQueryResult<ModmailSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).modmailSettings(),
		queryFn: () => api.get<ModmailSettings>(`/guilds/${guildId}/modmail/settings`),
	});
}

export function useSaveModmailSettings(
	guildId: string,
): UseMutationResult<ModmailSettings, Error, ModmailSettingsPatch> {
	return useDocumentMutation(
		keys.guild(guildId).modmailSettings(),
		(patch) => api.patch<ModmailSettings>(`/guilds/${guildId}/modmail/settings`, patch),
		[keys.guild(guildId).overview(), keys.guild(guildId).modmailConversations()],
	);
}

export function useModmailConversations(guildId: string): UseQueryResult<ModmailConversations> {
	return useQuery({
		queryKey: keys.guild(guildId).modmailConversations(),
		queryFn: () => api.get<ModmailConversations>(`/guilds/${guildId}/modmail/conversations`),
	});
}

export function useCloseConversation(guildId: string): UseMutationResult<ModmailConversation, Error, string> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (conversationId) =>
			api.post<ModmailConversation>(`/guilds/${guildId}/modmail/conversations/${conversationId}/close`, {}),
		onSettled: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: keys.guild(guildId).modmailConversations() }),
				client.invalidateQueries({ queryKey: keys.guild(guildId).modmailSettings() }),
			]),
	});
}
