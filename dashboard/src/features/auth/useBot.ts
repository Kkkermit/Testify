import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type BotIdentity } from "@testify/shared";
import { useEffect, useMemo } from "react";
import { nameTheBot } from "@/i18n";
import { api, ApiError } from "@/lib/api";
import {
	type BotLook,
	nameHomeScreen,
	rememberBotLook,
	rememberBotName,
	rememberedBotLook,
	showBotIcon,
} from "@/lib/brand";
import { keys } from "@/lib/queries";

/** The API answers 503 while the bot connects or restarts, which outlasts two quick retries. */
const CONNECTING_RETRIES = 30;
const CONNECTING_RETRY_MS = 2_000;

function stillConnecting(error: Error): boolean {
	return error instanceof ApiError && (error.code === "bot_connecting" || error.code === "api_down");
}

export function retryBot(failures: number, error: Error): boolean {
	return failures < (stillConnecting(error) ? CONNECTING_RETRIES : 2);
}

export function botRetryDelay(failures: number, error: Error): number {
	return stillConnecting(error) ? CONNECTING_RETRY_MS : Math.min(1_000 * 2 ** failures, 30_000);
}

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
		if (name === undefined) return;
		nameTheBot(name);
		rememberBotName(name);
		nameHomeScreen(name);
	}, [name]);

	const { avatarUrl, bannerUrl, accentColour } = bot.data ?? {};
	useEffect(() => {
		if (avatarUrl === undefined) return;
		rememberBotLook({ avatarUrl, bannerUrl: bannerUrl ?? null, accentColour: accentColour ?? null });
	}, [avatarUrl, bannerUrl, accentColour]);

	return bot;
}

export function useBotLook(): BotLook {
	const bot = useBot();
	const remembered = useMemo(rememberedBotLook, []);
	const look: BotLook =
		bot.data === undefined
			? remembered
			: {
					name: bot.data.name,
					avatarUrl: bot.data.avatarUrl,
					bannerUrl: bot.data.bannerUrl,
					accentColour: bot.data.accentColour,
				};

	useEffect(() => {
		if (look.avatarUrl !== null) showBotIcon(look.avatarUrl);
	}, [look.avatarUrl]);

	return look;
}
