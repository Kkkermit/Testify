import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type CommandCatalogue, type CommandRunRequest, type CommandRunResult } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useRunnable(): UseQueryResult<CommandCatalogue> {
	return useQuery({
		queryKey: keys.owner.runner(),
		queryFn: () => api.get<CommandCatalogue>("/owner/runner"),
	});
}

/**
 * Nothing is cached: a run is an action, not a resource, and the same arguments twice are two runs. The result
 * lives in the mutation itself, which is also what makes "run again" mean run again.
 */
export function useRunCommand(): UseMutationResult<CommandRunResult, Error, { name: string } & CommandRunRequest> {
	return useMutation({
		mutationFn: ({ name, ...body }) => api.post<CommandRunResult>(`/owner/runner/${name}`, body),
	});
}
