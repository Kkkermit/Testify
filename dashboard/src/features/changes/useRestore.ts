import {
	useMutation,
	type UseMutationResult,
	useQuery,
	useQueryClient,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type ChangeRestore, RESTORABLE, type Restorable } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

function entryOf(restore: ChangeRestore): Restorable {
	return RESTORABLE[restore.action];
}

/** The setting as it stands, read afresh whenever the panel opens, because what matters is what it holds now. */
export function useCurrentSetting(guildId: string, restore: ChangeRestore, enabled: boolean): UseQueryResult<unknown> {
	const entry = entryOf(restore);
	const path = entry.read ?? entry.path;

	return useQuery({
		queryKey: keys.guild(guildId).restoreRead(path),
		queryFn: () => api.get<unknown>(`/guilds/${guildId}${path}`),
		enabled,
		staleTime: 0,
	});
}

/** Sends the old values to the route that made the change, so its own gates decide this as they decided that. */
export function usePutBack(guildId: string): UseMutationResult<unknown, Error, ChangeRestore> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (restore: ChangeRestore) => {
			const entry = entryOf(restore);
			const path = `/guilds/${guildId}${entry.path}`;
			return entry.method === "PUT" ? api.put<unknown>(path, restore.put) : api.patch<unknown>(path, restore.put);
		},
		onSuccess: () => client.invalidateQueries({ queryKey: keys.guild(guildId).all() }),
	});
}
