import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { keys } from "@/lib/queries";

/** An account blocked mid-session is refused on its next request; asking `/auth/me` again shows it why. */
export function createQueryClient(): QueryClient {
	const client: QueryClient = new QueryClient({
		queryCache: new QueryCache({ onError: (error) => recheck(error) }),
		mutationCache: new MutationCache({ onError: (error) => recheck(error) }),
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				// Retrying a refusal only delays the screen that explains it.
				retry: (failureCount, error) => !(error instanceof ApiError && error.status < 500) && failureCount < 2,
			},
		},
	});

	function recheck(error: Error): void {
		if (error instanceof ApiError && error.code === "blacklisted")
			void client.invalidateQueries({ queryKey: keys.me() });
	}

	return client;
}
