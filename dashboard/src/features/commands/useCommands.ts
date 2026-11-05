import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type CommandCatalogue } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useCommands(): UseQueryResult<CommandCatalogue> {
	return useQuery({
		queryKey: keys.commands(),
		queryFn: () => api.get<CommandCatalogue>("/commands"),
		staleTime: 30 * 60 * 1000,
	});
}
