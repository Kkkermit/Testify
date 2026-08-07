import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type AutomodCreate, type AutomodRules } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useAutomod(guildId: string): UseQueryResult<AutomodRules> {
	return useQuery({
		queryKey: keys.guild(guildId).automod(),
		queryFn: () => api.get<AutomodRules>(`/guilds/${guildId}/automod`),
	});
}

/**
 * Not optimistic: every write here goes to Discord rather than to Mongo, and a row that appeared before Discord
 * agreed would be claiming a rule exists that may not. Each answer is the whole list, so it replaces.
 */
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
	const client = useQueryClient();
	const key = keys.guild(guildId).automod();

	return useMutation({
		mutationKey: key,
		mutationFn: send,
		onSuccess: (rules) => {
			// The same guard the settings sections use: a whole-list answer is only trusted when it is alone.
			if (client.isMutating({ mutationKey: key }) === 1) client.setQueryData(key, rules);
		},
		onSettled: () => {
			if (client.isMutating({ mutationKey: key }) !== 1) return;
			void client.invalidateQueries({ queryKey: key });
		},
	});
}
