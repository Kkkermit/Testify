import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
	type CommandRunRow,
	type GuildUsageReport,
	type LogFeed,
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
		// The last page stays on screen while the next loads, so a sort or a keystroke does not flash a skeleton.
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

/** The one screen worth polling; pausing stops the poll rather than freezing a snapshot, so a line cannot scroll away while it is being read. */
export function useLogs(level: ReportedLogLevel, search: string, paused: boolean): UseQueryResult<LogFeed> {
	const query = new URLSearchParams({ level, limit: "300" });
	if (search.trim() !== "") query.set("q", search.trim());

	return useQuery({
		queryKey: keys.owner.logs(level, search),
		queryFn: () => api.get<LogFeed>(`/analytics/logs?${query.toString()}`),
		refetchInterval: paused ? false : 5_000,
		staleTime: 0,
	});
}

export function useRuntime(): UseQueryResult<RuntimeInfo> {
	return useQuery({
		queryKey: keys.owner.runtime(),
		queryFn: () => api.get<RuntimeInfo>("/analytics/runtime"),
		staleTime: 30_000,
	});
}
