import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type BotIdentity } from "@testify/shared";
import { useEffect } from "react";
import { nameTheBot } from "@/i18n";
import { api, ApiError } from "@/lib/api";
import { keys } from "@/lib/queries";

/** The API answers 503 until Discord says the bot is ready, which takes far longer than two quick retries. */
const CONNECTING_RETRIES = 30;
const CONNECTING_RETRY_MS = 2_000;

function stillConnecting(error: Error): boolean {
	return error instanceof ApiError && error.code === "bot_connecting";
}

export function retryBot(failures: number, error: Error): boolean {
	return failures < (stillConnecting(error) ? CONNECTING_RETRIES : 2);
}

export function botRetryDelay(failures: number, error: Error): number {
	return stillConnecting(error) ? CONNECTING_RETRY_MS : Math.min(1_000 * 2 ** failures, 30_000);
}

/** Cached for the session rather than refetched per screen; every consumer falls back to the built-in mark. */
export function useBot(): UseQueryResult<BotIdentity> {
	const bot = useQuery({
		queryKey: keys.bot(),
		queryFn: () => api.get<BotIdentity>("/bot"),
		staleTime: 15 * 60 * 1000,
		retry: retryBot,
		retryDelay: botRetryDelay,
	});

	const name = bot.data?.name;
	useEffect(() => {
		if (name !== undefined) nameTheBot(name);
	}, [name]);

	return bot;
}
