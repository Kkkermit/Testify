import {
	keepPreviousData,
	useMutation,
	type UseMutationResult,
	useQuery,
	useQueryClient,
	type UseQueryResult,
} from "@tanstack/react-query";
import {
	type CommandRunRow,
	type GuildUsageReport,
	type LogFeed,
	type LogRuns,
	type MemberUsageRow,
	type OwnerGuildFilter,
	type OwnerGuildRow,
	type OwnerGuildSort,
	type OwnerStats,
	type Paged,
	type ReportedLogLevel,
	type RuntimeInfo,
	type UsageReport,
} from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export const PER_PAGE = 25;

export function useOwnerStats(): UseQueryResult<OwnerStats> {
	return useQuery({
		queryKey: keys.owner.stats(),
		queryFn: () => api.get<OwnerStats>("/owner/stats"),
		staleTime: 15_000,
	});
}

export function useOwnerGuilds(
	page: number,
	sort: OwnerGuildSort,
	filter: OwnerGuildFilter,
	search: string,
): UseQueryResult<Paged<OwnerGuildRow>> {
	const query = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE), sort, filter });
	if (search.trim() !== "") query.set("q", search.trim());

	return useQuery({
		queryKey: keys.owner.guilds(page, sort, filter, search.trim()),
		queryFn: () => api.get<Paged<OwnerGuildRow>>(`/owner/guilds?${query.toString()}`),
		placeholderData: keepPreviousData,
	});
}

export function useUsage(days: number): UseQueryResult<UsageReport> {
	return useQuery({
		queryKey: keys.owner.usage(days),
		queryFn: () => api.get<UsageReport>(`/analytics/usage?days=${String(days)}`),
		staleTime: 60_000,
	});
}

export function useGuildUsage(guildId: string, days: number): UseQueryResult<GuildUsageReport> {
	return useQuery({
		queryKey: keys.owner.guildUsage(guildId, days),
		queryFn: () => api.get<GuildUsageReport>(`/analytics/guilds/${guildId}?days=${String(days)}`),
		staleTime: 60_000,
	});
}

export function useGuildMembers(
	guildId: string,
	days: number,
	page: number,
	search: string,
): UseQueryResult<Paged<MemberUsageRow>> {
	const query = new URLSearchParams({ days: String(days), page: String(page), perPage: String(PER_PAGE) });
	if (search.trim() !== "") query.set("q", search.trim());

	return useQuery({
		queryKey: keys.owner.guildMembers(guildId, days, page, search.trim()),
		queryFn: () => api.get<Paged<MemberUsageRow>>(`/analytics/guilds/${guildId}/members?${query.toString()}`),
		placeholderData: keepPreviousData,
	});
}

export function useGuildRuns(
	guildId: string,
	days: number,
	page: number,
	userId: string | null,
	command: string | null,
): UseQueryResult<Paged<CommandRunRow>> {
	const query = new URLSearchParams({ days: String(days), page: String(page), perPage: String(PER_PAGE) });
	if (userId !== null) query.set("userId", userId);
	if (command !== null) query.set("command", command);

	return useQuery({
		queryKey: keys.owner.guildRuns(guildId, days, page, userId, command),
		queryFn: () => api.get<Paged<CommandRunRow>>(`/analytics/guilds/${guildId}/runs?${query.toString()}`),
		placeholderData: keepPreviousData,
	});
}

/** `run` is null for the run going now, which is the only one that still changes. */
export function useLogs(
	run: string | null,
	level: ReportedLogLevel,
	search: string,
	paused: boolean,
	enabled = true,
): UseQueryResult<LogFeed> {
	const query = new URLSearchParams({ level, limit: "300" });
	if (search.trim() !== "") query.set("q", search.trim());
	if (run !== null) query.set("run", run);

	return useQuery({
		queryKey: keys.owner.logs(run ?? "now", level, search.trim()),
		queryFn: () => api.get<LogFeed>(`/analytics/logs?${query.toString()}`),
		refetchInterval: run === null && !paused ? 5_000 : false,
		staleTime: run === null ? 0 : 60_000,
		enabled,
	});
}

export function useLogRuns(level: ReportedLogLevel, search: string, paused: boolean): UseQueryResult<LogRuns> {
	const query = new URLSearchParams({ level });
	if (search.trim() !== "") query.set("q", search.trim());

	return useQuery({
		queryKey: keys.owner.logRuns(level, search.trim()),
		queryFn: () => api.get<LogRuns>(`/analytics/logs/runs?${query.toString()}`),
		refetchInterval: paused ? false : 5_000,
		staleTime: 0,
	});
}

/** Deletes a past run's logs, or empties the run going now. */
export function useDeleteLogs(): UseMutationResult<void, Error, string> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (runId) => api.delete<void>(`/control/logs/${runId}`),
		onSettled: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: ["owner", "logs"] }),
				client.invalidateQueries({ queryKey: ["owner", "log-runs"] }),
			]),
	});
}

export function useRuntime(): UseQueryResult<RuntimeInfo> {
	return useQuery({
		queryKey: keys.owner.runtime(),
		queryFn: () => api.get<RuntimeInfo>("/analytics/runtime"),
		staleTime: 30_000,
	});
}
