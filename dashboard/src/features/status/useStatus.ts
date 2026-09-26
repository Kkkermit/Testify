import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type StatusResponse } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

const STATUS_REFRESH_MS = 30_000;

/** Polls while the tab is visible; React Query stops the interval in a background tab on its own. */
export function useStatus(): UseQueryResult<StatusResponse> {
	return useQuery({
		queryKey: keys.status(),
		queryFn: () => api.get<StatusResponse>("/status"),
		refetchInterval: STATUS_REFRESH_MS,
	});
}
