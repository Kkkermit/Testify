import {
	keepPreviousData,
	useMutation,
	type UseMutationResult,
	useQuery,
	useQueryClient,
	type UseQueryResult,
} from "@tanstack/react-query";
import {
	type AudienceReport,
	type BotActivityReport,
	type CollectorSetup,
	type CommandReport,
	FUNNEL_LIMITS,
	type FunnelReport,
	type GrowthReport,
	type GuildUsageReport,
	type LiveRead,
	type LogFeed,
	type LogRuns,
	type OwnerGuildFilter,
	type OwnerGuildPage,
	type OwnerGuildSort,
	type OwnerStats,
	type PanelsReport,
	type ReliabilityReport,
	type ReportedLogLevel,
	type RetentionReport,
	type RunsFilters,
	type RunsPage,
	type RuntimeInfo,
	type TopRunners,
	type UsageReport,
} from "@testify/shared";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";
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
): UseQueryResult<OwnerGuildPage> {
	const query = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE), sort, filter });
	if (search.trim() !== "") query.set("q", search.trim());

	return useQuery({
		queryKey: keys.owner.guilds(page, sort, filter, search.trim()),
		queryFn: () => api.get<OwnerGuildPage>(`/owner/guilds?${query.toString()}`),
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

function useSection<T>(section: string, query: Record<string, string>, enabled = true): UseQueryResult<T> {
	const search = new URLSearchParams(query).toString();
	return useQuery({
		queryKey: keys.owner.usageSection(section, search),
		queryFn: () => api.get<T>(`/analytics/${section}?${search}`),
		staleTime: 60_000,
		enabled,
	});
}

const windowOf = (days: number): Record<string, string> => ({ days: String(days) });

export const useAudience = (days: number, tz: string): UseQueryResult<AudienceReport> =>
	useSection("audience", { ...windowOf(days), tz });

export const useGrowth = (days: number): UseQueryResult<GrowthReport> => useSection("growth", windowOf(days));

export const usePanels = (days: number): UseQueryResult<PanelsReport> => useSection("panels", windowOf(days));

export const useBotActivity = (days: number): UseQueryResult<BotActivityReport> =>
	useSection("activity", windowOf(days));

export const useReliability = (days: number): UseQueryResult<ReliabilityReport> =>
	useSection("reliability", windowOf(days));

/** The name is already checked by `commandFrom`, so it can stand in the path as it is. */
export const useCommandReport = (name: string, days: number): UseQueryResult<CommandReport> =>
	useSection(`commands/${name}`, windowOf(days));

export const useCollectorSetup = (): UseQueryResult<CollectorSetup> => useSection("setup", {});

export const useFunnel = (days: number, tz: string, steps: string[], hours: number): UseQueryResult<FunnelReport> =>
	useSection(
		"funnel",
		{ ...windowOf(days), tz, steps: steps.join(","), hours: String(hours) },
		steps.length >= FUNNEL_LIMITS.minSteps,
	);

export const useRetention = (
	days: number,
	tz: string,
	start: string | null,
	back: string | null,
	interval: RetentionReport["interval"],
): UseQueryResult<RetentionReport> =>
	useSection(
		"retention",
		{ ...windowOf(days), tz, start: start ?? "", interval, ...(back === null ? {} : { back }) },
		start !== null,
	);

/** A POST, so the person looked up stays in the body and out of every address. */
export function useRuns(days: number, filters: RunsFilters, before: string | null): UseQueryResult<RunsPage> {
	return useQuery({
		queryKey: keys.owner.runs(days, JSON.stringify(filters), before ?? ""),
		queryFn: () => api.post<RunsPage>("/analytics/runs", { days, ...filters, ...(before === null ? {} : { before }) }),
		staleTime: 60_000,
		placeholderData: keepPreviousData,
	});
}

export const useTopRunners = (window: TopRunners["window"]): UseQueryResult<TopRunners> =>
	useQuery({
		queryKey: keys.owner.topRunners(window),
		queryFn: () => api.get<TopRunners>(`/analytics/runs/top?window=${window}`),
		staleTime: 60_000,
	});

const LIVE_EVERY_MS = 3_000;

/** Asking is what keeps the bot's one stream open, so a hidden tab stops asking and the stream closes. */
export function useLive(): UseQueryResult<LiveRead> {
	const visible = useDocumentVisible();
	return useQuery({
		queryKey: keys.owner.live(),
		queryFn: () => api.get<LiveRead>("/analytics/live"),
		refetchInterval: visible ? LIVE_EVERY_MS : false,
	});
}

export function useGuildUsage(guildId: string, days: number): UseQueryResult<GuildUsageReport> {
	return useQuery({
		queryKey: keys.owner.guildUsage(guildId, days),
		queryFn: () => api.get<GuildUsageReport>(`/analytics/guilds/${guildId}?days=${String(days)}`),
		staleTime: 60_000,
	});
}

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
				client.invalidateQueries({ queryKey: keys.owner.logsAll() }),
				client.invalidateQueries({ queryKey: keys.owner.logRunsAll() }),
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
