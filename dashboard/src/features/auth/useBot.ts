import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type BotIdentity } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/** Cached for the session rather than refetched per screen; every consumer falls back to the built-in mark. */
export function useBot(): UseQueryResult<BotIdentity> {
	return useQuery({
		queryKey: keys.bot(),
		queryFn: () => api.get<BotIdentity>("/bot"),
		staleTime: 15 * 60 * 1000,
	});
}
