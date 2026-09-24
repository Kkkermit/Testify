import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type BotIdentity } from "@testify/shared";
import { useEffect } from "react";
import { nameTheBot } from "@/i18n";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/** Cached for the session rather than refetched per screen; every consumer falls back to the built-in mark. */
export function useBot(): UseQueryResult<BotIdentity> {
	const bot = useQuery({
		queryKey: keys.bot(),
		queryFn: () => api.get<BotIdentity>("/bot"),
		staleTime: 15 * 60 * 1000,
	});

	const name = bot.data?.name;
	useEffect(() => {
		if (name !== undefined) nameTheBot(name);
	}, [name]);

	return bot;
}
