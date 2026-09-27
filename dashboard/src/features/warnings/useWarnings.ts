import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import {
	type GuildWarning,
	type GuildWarningsPage,
	type MemberMatch,
	type WarningAdd,
	type WarningAdded,
	type WarnLadder,
	type WarnStep,
} from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useGuildWarnings(
	guildId: string,
	options: { page: number; perPage: number; query: string },
): UseQueryResult<GuildWarningsPage> {
	const { page, perPage } = options;
	const query = options.query.trim();
	const search = new URLSearchParams({ page: String(page), perPage: String(perPage) });
	if (query !== "") search.set("q", query);

	return useQuery({
		queryKey: keys.guild(guildId).warnings(page, perPage, query),
		queryFn: () => api.get<GuildWarningsPage>(`/guilds/${guildId}/warnings?${search.toString()}`),
		placeholderData: keepPreviousData,
	});
}

export function usePunishments(guildId: string): UseQueryResult<WarnLadder> {
	return useQuery({
		queryKey: keys.guild(guildId).punishments(),
		queryFn: () => api.get<WarnLadder>(`/guilds/${guildId}/warnings/punishments`),
	});
}

/** The whole list in one request, because the control is the list. */
export function useSavePunishments(guildId: string): UseMutationResult<WarnLadder, Error, WarnStep[]> {
	const client = useQueryClient();
	const key = keys.guild(guildId).punishments();

	return useMutation({
		mutationKey: key,
		mutationFn: (steps: WarnStep[]) => api.put<WarnLadder>(`/guilds/${guildId}/warnings/punishments`, { steps }),
		onSuccess: (ladder) => {
			// A whole-document answer is only trusted while it is the only write in flight.
			if (client.isMutating({ mutationKey: key }) === 1) client.setQueryData(key, ladder);
		},
		onSettled: () => {
			if (client.isMutating({ mutationKey: key }) !== 1) return;
			void client.invalidateQueries({ queryKey: key });
		},
	});
}

export function useMemberSearch(guildId: string, query: string): UseQueryResult<MemberMatch[]> {
	const trimmed = query.trim();

	return useQuery({
		queryKey: keys.guild(guildId).memberSearch(trimmed),
		queryFn: () => api.get<MemberMatch[]>(`/guilds/${guildId}/members/search?q=${encodeURIComponent(trimmed)}`),
		enabled: trimmed !== "",
		staleTime: 30_000,
	});
}

/** Every warning write touches the server's list and the member's own page, so both are read again afterwards. */
function useWarningWrite<Body extends { userId: string }, Result>(
	guildId: string,
	send: (body: Body) => Promise<Result>,
): UseMutationResult<Result, Error, Body> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: send,
		onSettled: (_result, _error, body) => {
			void client.invalidateQueries({ queryKey: keys.guild(guildId).allWarnings() });
			void client.invalidateQueries({ queryKey: keys.guild(guildId).member(body.userId) });
		},
	});
}

export function useAddWarning(guildId: string): UseMutationResult<WarningAdded, Error, WarningAdd> {
	return useWarningWrite(guildId, (body: WarningAdd) => api.post<WarningAdded>(`/guilds/${guildId}/warnings`, body));
}

interface WarningKey {
	userId: string;
	warnId: string;
}

export function useEditWarning(
	guildId: string,
): UseMutationResult<GuildWarning, Error, WarningKey & { reason: string }> {
	return useWarningWrite(guildId, ({ userId, warnId, reason }: WarningKey & { reason: string }) =>
		api.patch<GuildWarning>(`/guilds/${guildId}/warnings/${userId}/${warnId}`, { reason }),
	);
}

export function useRemoveWarning(guildId: string): UseMutationResult<void, Error, WarningKey> {
	return useWarningWrite(guildId, ({ userId, warnId }: WarningKey) =>
		api.delete<void>(`/guilds/${guildId}/warnings/${userId}/${warnId}`),
	);
}

export function useClearWarnings(guildId: string): UseMutationResult<void, Error, { userId: string }> {
	return useWarningWrite(guildId, ({ userId }: { userId: string }) =>
		api.delete<void>(`/guilds/${guildId}/warnings/${userId}`),
	);
}
