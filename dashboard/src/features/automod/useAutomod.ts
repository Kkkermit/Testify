import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type AutomodCreate, type AutomodRules } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useAutomod(guildId: string): UseQueryResult<AutomodRules> {
	return useQuery({
		queryKey: keys.guild(guildId).automod(),
		queryFn: () => api.get<AutomodRules>(`/guilds/${guildId}/automod`),
	});
}

export function useAddRule(guildId: string): UseMutationResult<AutomodRules, Error, AutomodCreate> {
	return useRuleMutation(guildId, (body) => api.post<AutomodRules>(`/guilds/${guildId}/automod`, body));
}

export function useToggleRule(
	guildId: string,
): UseMutationResult<AutomodRules, Error, { ruleId: string; enabled: boolean }> {
	return useRuleMutation(guildId, ({ ruleId, enabled }) =>
		api.patch<AutomodRules>(`/guilds/${guildId}/automod/${ruleId}`, { enabled }),
	);
}

export function useRemoveRule(guildId: string): UseMutationResult<AutomodRules, Error, { ruleId: string }> {
	return useRuleMutation(guildId, ({ ruleId }) => api.delete<AutomodRules>(`/guilds/${guildId}/automod/${ruleId}`));
}

function useRuleMutation<Body>(
	guildId: string,
	send: (body: Body) => Promise<AutomodRules>,
): UseMutationResult<AutomodRules, Error, Body> {
	return useDocumentMutation(keys.guild(guildId).automod(), send);
}
