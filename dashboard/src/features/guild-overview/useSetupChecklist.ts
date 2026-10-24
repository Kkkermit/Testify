import {
	useMutation,
	type UseMutationResult,
	useQuery,
	useQueryClient,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type SetupChecklist, type SetupStep } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useSetupChecklist(guildId: string): UseQueryResult<SetupChecklist> {
	return useQuery({
		queryKey: keys.guild(guildId).setupChecklist(),
		queryFn: () => api.get<SetupChecklist>(`/guilds/${guildId}/setup`),
	});
}

/** A step changes the feature tiles as well, so the whole server is read again rather than patched. */
export function useRunSetupStep(guildId: string): UseMutationResult<SetupChecklist, Error, SetupStep> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (step: SetupStep) => api.post<SetupChecklist>(`/guilds/${guildId}/setup/${step}`),
		onSettled: () => client.invalidateQueries({ queryKey: keys.guild(guildId).all() }),
	});
}
