import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type CommandToggleState, type CommandTogglePut } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/**
 * Which commands are switched off. The path is the only difference between the two scopes — a server's own
 * list, and the bot-wide one behind the owner gate.
 */
function pathFor(guildId: string | null): string {
	return guildId === null ? "/owner/commands" : `/guilds/${guildId}/commands`;
}

export function useCommandToggles(guildId: string | null, enabled = true): UseQueryResult<CommandToggleState> {
	return useQuery({
		queryKey: keys.commandToggles(guildId),
		queryFn: () => api.get<CommandToggleState>(pathFor(guildId)),
		enabled,
	});
}

export function useSaveCommandToggles(
	guildId: string | null,
): UseMutationResult<CommandToggleState, Error, CommandTogglePut> {
	const client = useQueryClient();
	const key = keys.commandToggles(guildId);

	return useMutation({
		mutationFn: (body: CommandTogglePut) => api.put<CommandToggleState>(pathFor(guildId), body),
		// Optimistic: a switch that waits for a round trip before moving feels broken, and a refusal puts it back.
		onMutate: async (body) => {
			await client.cancelQueries({ queryKey: key });
			const previous = client.getQueryData<CommandToggleState>(key);

			if (previous !== undefined)
				client.setQueryData<CommandToggleState>(key, { ...previous, disabled: body.disabled });

			return { previous };
		},
		onError: (_error, _body, context) => {
			if (context?.previous !== undefined) client.setQueryData(key, context.previous);
		},
		onSuccess: (state) => {
			client.setQueryData(key, state);
		},
	});
}
