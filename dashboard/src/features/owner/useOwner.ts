import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
	type LogFeed,
	type OwnerGuildRow,
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

export function useOwnerGuilds(page: number): UseQueryResult<Paged<OwnerGuildRow>> {
	return useQuery({
		queryKey: keys.owner.guilds(page),
		queryFn: () => api.get<Paged<OwnerGuildRow>>(`/owner/guilds?page=${String(page)}&perPage=${String(PER_PAGE)}`),
	});
}

export function useUsage(days: number): UseQueryResult<UsageReport> {
	return useQuery({
		queryKey: keys.owner.usage(days),
		queryFn: () => api.get<UsageReport>(`/analytics/usage?days=${String(days)}`),
		staleTime: 60_000,
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
