import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type BlacklistAdd, type BlacklistRow } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useBlacklist(): UseQueryResult<BlacklistRow[]> {
	return useQuery({
		queryKey: keys.owner.blacklist(),
		queryFn: () => api.get<BlacklistRow[]>("/owner/blacklist"),
	});
}

/** Both writes invalidate rather than patch, because neither answer is the whole list. */
export function useBlockUser(): UseMutationResult<BlacklistRow, Error, BlacklistAdd> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (body: BlacklistAdd) => api.post<BlacklistRow>("/owner/blacklist", body),
		onSuccess: () => client.invalidateQueries({ queryKey: keys.owner.blacklist() }),
	});
}

export function useUnblockUser(): UseMutationResult<{ userId: string }, Error, string> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (userId: string) => api.delete<{ userId: string }>(`/owner/blacklist/${userId}`),
		onSuccess: () => client.invalidateQueries({ queryKey: keys.owner.blacklist() }),
	});
}
