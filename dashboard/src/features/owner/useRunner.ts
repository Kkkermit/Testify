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

export function useRunCommand(): UseMutationResult<CommandRunResult, Error, { name: string } & CommandRunRequest> {
	return useMutation({
		mutationFn: ({ name, ...body }) => api.post<CommandRunResult>(`/owner/runner/${name}`, body),
	});
}
