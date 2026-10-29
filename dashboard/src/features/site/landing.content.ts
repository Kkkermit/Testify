import { type TranslationKey } from "@/i18n";

/** The hero's three commands, each a real one whose options are named as the bot declares them. */
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

/** What the bot does, in the feature registry's own keys so each wears the icon and tint it has everywhere else. */
export const FEATURES: readonly { look: string; titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
	{ look: "moderation", titleKey: "landing.features.moderation", bodyKey: "landing.features.moderationBody" },
	{ look: "levelling", titleKey: "landing.features.levelling", bodyKey: "landing.features.levellingBody" },
	{ look: "music", titleKey: "landing.features.music", bodyKey: "landing.features.musicBody" },
	{ look: "casino", titleKey: "landing.features.casino", bodyKey: "landing.features.casinoBody" },
	{ look: "tickets", titleKey: "landing.features.tickets", bodyKey: "landing.features.ticketsBody" },
	{ look: "community", titleKey: "landing.features.community", bodyKey: "landing.features.communityBody" },
];

/** Running a copy is a real sequence, which is the only reason these are numbered. */
export const SELF_HOST_STEPS: readonly { slug: string; labelKey: TranslationKey }[] = [
	{ slug: "requirements", labelKey: "landing.selfHost.requirements" },
	{ slug: "setup", labelKey: "landing.selfHost.setup" },
	{ slug: "quick-start", labelKey: "landing.selfHost.start" },
	{ slug: "docker", labelKey: "landing.selfHost.host" },
];
