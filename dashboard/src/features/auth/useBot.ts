import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type BotIdentity } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/**
 * The bot's own profile. It changes when somebody edits the application, so it is cached for the session rather
 * than refetched per screen, and every consumer falls back to the built-in mark if it never arrives.
 */
export function useBot(): UseQueryResult<BotIdentity> {
	return useQuery({
		queryKey: keys.bot(),
		queryFn: () => api.get<BotIdentity>("/bot"),
		staleTime: 15 * 60 * 1000,
	});
}
