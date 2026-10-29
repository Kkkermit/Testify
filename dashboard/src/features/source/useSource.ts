import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type RepositoryStanding, type RepositoryTraffic, type SourceFile, type SourceTree } from "@testify/shared";
import { api, ApiError } from "@/lib/api";
import { keys } from "@/lib/queries";

/** The bot asks GitHub at most hourly, so the browser keeps each answer for the visit rather than asking again. */
const HOUR = 60 * 60 * 1000;

/** A refusal is the answer, not a hiccup, so only a failure GitHub might recover from is tried again. */
function retryUnlessRefused(failures: number, error: Error): boolean {
	return !(error instanceof ApiError && [403, 404].includes(error.status)) && failures < 2;
}

export function useStanding(): UseQueryResult<RepositoryStanding> {
	return useQuery({
		queryKey: keys.source.standing(),
		queryFn: () => api.get<RepositoryStanding>("/site/repository"),
		staleTime: HOUR,
		retry: retryUnlessRefused,
	});
}

export function useTraffic(): UseQueryResult<RepositoryTraffic> {
	return useQuery({
		queryKey: keys.source.traffic(),
		queryFn: () => api.get<RepositoryTraffic>("/site/traffic"),
		staleTime: HOUR,
		retry: retryUnlessRefused,
	});
}

export function useTree(): UseQueryResult<SourceTree> {
	return useQuery({
		queryKey: keys.source.tree(),
		queryFn: () => api.get<SourceTree>("/site/tree"),
		staleTime: HOUR,
		retry: retryUnlessRefused,
	});
}

export function useSourceFile(path: string | null): UseQueryResult<SourceFile> {
	return useQuery({
		queryKey: keys.source.file(path ?? ""),
		queryFn: () => api.get<SourceFile>(`/site/file?path=${encodeURIComponent(path ?? "")}`),
		enabled: path !== null,
		staleTime: HOUR,
		retry: retryUnlessRefused,
	});
}
