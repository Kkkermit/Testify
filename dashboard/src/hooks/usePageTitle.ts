import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { currentBotName } from "@/i18n";

export function pageTitle(title: string, context?: string, bot = currentBotName()): string {
	return [title, context, bot].filter((part) => part !== undefined && part !== "").join(" · ");
}

export function usePageTitle(title: string, context?: string): void {
	useTranslation();
	const bot = currentBotName();

	useEffect(() => {
		document.title = pageTitle(title, context, bot);
	}, [title, context, bot]);
}
