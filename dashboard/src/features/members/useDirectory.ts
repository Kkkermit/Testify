import {
	keepPreviousData,
	useMutation,
	type UseMutationResult,
	useQuery,
	useQueryClient,
	type UseQueryResult,
} from "@tanstack/react-query";
import {
	type BulkBanBody,
	type BulkKickBody,
	type BulkResult,
	type BulkRolesBody,
	type BulkTimeoutBody,
	type DirectoryPage,
} from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useDirectory(guildId: string, search: string): UseQueryResult<DirectoryPage> {
	return useQuery({
		queryKey: keys.guild(guildId).directory(search),
		queryFn: () => api.get<DirectoryPage>(`/guilds/${guildId}/members${search === "" ? "" : `?${search}`}`),
		placeholderData: keepPreviousData,
		staleTime: 15_000,
	});
}

export type BulkRequest =
	| { kind: "roles"; body: BulkRolesBody }
	| { kind: "timeout"; body: BulkTimeoutBody }
	| { kind: "kick"; body: BulkKickBody }
	| { kind: "ban"; body: BulkBanBody };

export function useBulkAction(guildId: string): UseMutationResult<BulkResult, Error, BulkRequest> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: ({ kind, body }: BulkRequest) => api.post<BulkResult>(`/guilds/${guildId}/members/bulk/${kind}`, body),
		onSettled: async () => {
			await client.invalidateQueries({ queryKey: keys.guild(guildId).directoryAll() });
		},
	});
}
