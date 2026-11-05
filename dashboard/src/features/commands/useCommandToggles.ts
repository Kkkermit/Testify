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
	const alone = (): boolean => client.isMutating({ mutationKey: key }) === 1;

	return useMutation({
		mutationKey: key,
		mutationFn: (body: CommandTogglePut) => api.put<CommandToggleState>(pathFor(guildId), body),
		onMutate: async (body) => {
			await client.cancelQueries({ queryKey: key });
			const previous = client.getQueryData<CommandToggleState>(key);

			if (previous !== undefined)
				client.setQueryData<CommandToggleState>(key, { ...previous, disabled: body.disabled });

			return { previous };
		},
		onError: (_error, _body, context) => {
			if (alone() && context?.previous !== undefined) client.setQueryData(key, context.previous);
		},
		onSuccess: (state) => {
			if (alone()) client.setQueryData(key, state);
		},
		onSettled: () => {
			if (alone()) void client.invalidateQueries({ queryKey: key });
		},
	});
}
