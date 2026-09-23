import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { currentBotName } from "@/i18n";

/** Set on every route, or history is fourteen entries all named after the bot; the server name tells two tabs on the same screen apart. */
export function pageTitle(title: string, context?: string, bot = currentBotName()): string {
	return [title, context, bot].filter((part) => part !== undefined && part !== "").join(" · ");
}

export function usePageTitle(title: string, context?: string): void {
	// Subscribes to the bot being named, which re-renders this with the new name.
	useTranslation();
	const bot = currentBotName();

	useEffect(() => {
		document.title = pageTitle(title, context, bot);
	}, [title, context, bot]);
}
