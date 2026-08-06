import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type MeResponse, type SetupStatus } from "@testify/shared";
import { api, ApiError } from "@/lib/api";
import { keys } from "@/lib/queries";

/** The bootstrap call. A 401 means "show the sign-in screen", so it is neither retried nor treated as an error. */
export function useMe(): UseQueryResult<MeResponse | null> {
	return useQuery({
		queryKey: keys.me(),
		queryFn: async () => {
			try {
				return await api.get<MeResponse>("/auth/me");
			} catch (error) {
				if (error instanceof ApiError && error.status === 401) return null;
				throw error;
			}
		},
		retry: false,
		staleTime: 60_000,
	});
}

/** Answers Journey 4: a self-hoster who enabled the dashboard and has not filled in the OAuth settings yet. */
export function useSetup(): UseQueryResult<SetupStatus> {
	return useQuery({
		queryKey: keys.setup(),
		queryFn: () => api.get<SetupStatus>("/auth/setup"),
		staleTime: Infinity,
	});
}
