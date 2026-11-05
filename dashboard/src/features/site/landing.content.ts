import { type TranslationKey } from "@/i18n";

export const SCENES: readonly {
	command: string;
	prefixName: string;
	options: readonly ({ name: string; value: string } | { name: string; valueKey: TranslationKey })[];
}[] = [
	{ command: "play", prefixName: "play", options: [{ name: "query", valueKey: "landing.composer.query" }] },
	{
		command: "remind me",
		prefixName: "remindme",
		options: [
			{ name: "in", value: "2h" },
			{ name: "about", valueKey: "landing.composer.reminder" },
		],
	},
	{
		command: "warn create",
		prefixName: "warn create",
		options: [
			{ name: "user", value: "@Sam" },
			{ name: "reason", valueKey: "landing.composer.reason" },
		],
	},
];

export const FEATURES: readonly { look: string; titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
	{ look: "moderation", titleKey: "landing.features.moderation", bodyKey: "landing.features.moderationBody" },
	{ look: "levelling", titleKey: "landing.features.levelling", bodyKey: "landing.features.levellingBody" },
	{ look: "music", titleKey: "landing.features.music", bodyKey: "landing.features.musicBody" },
	{ look: "casino", titleKey: "landing.features.casino", bodyKey: "landing.features.casinoBody" },
	{ look: "tickets", titleKey: "landing.features.tickets", bodyKey: "landing.features.ticketsBody" },
	{ look: "community", titleKey: "landing.features.community", bodyKey: "landing.features.communityBody" },
];

export const SELF_HOST_STEPS: readonly { slug: string; labelKey: TranslationKey }[] = [
	{ slug: "requirements", labelKey: "landing.selfHost.requirements" },
	{ slug: "setup", labelKey: "landing.selfHost.setup" },
	{ slug: "quick-start", labelKey: "landing.selfHost.start" },
	{ slug: "docker", labelKey: "landing.selfHost.host" },
];
