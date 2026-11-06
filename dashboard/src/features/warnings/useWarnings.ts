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
} from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
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

export function useSavePunishments(guildId: string): UseMutationResult<WarnLadder, Error, WarnLadder> {
	return useDocumentMutation(keys.guild(guildId).punishments(), (ladder: WarnLadder) =>
		api.put<WarnLadder>(`/guilds/${guildId}/warnings/punishments`, ladder),
	);
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
