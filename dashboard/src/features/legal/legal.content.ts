import { type TranslationKey } from "@/i18n";

/** The documents as keys rather than prose: a fork edits one dictionary, and every language carries both. */

export interface LegalSection {
	heading: TranslationKey;
	paragraphs: TranslationKey[];
	list?: TranslationKey[];
	/** Paragraphs that follow the list rather than introduce it. */
	after?: TranslationKey[];
}

export interface LegalDocument {
	title: TranslationKey;
	summary: TranslationKey;
	sections: LegalSection[];
}

export const TERMS: LegalDocument = {
	title: "legal.termsTitle",
	summary: "legal.termsSummary",
	sections: [
		{
			heading: "legal.whoRuns",
			paragraphs: ["legal.whoRunsP1", "legal.whoRunsP2", "legal.whoRunsP3"],
		},
		{
			heading: "legal.usingBot",
			paragraphs: ["legal.usingBotP1"],
			list: ["legal.usingBotL1", "legal.usingBotL2", "legal.usingBotL3", "legal.usingBotL4", "legal.usingBotL5"],
		},
		{
			heading: "legal.fairUse",
			paragraphs: ["legal.fairUseP1"],
			list: ["legal.fairUseL1", "legal.fairUseL2", "legal.fairUseL3", "legal.fairUseL4", "legal.fairUseL5"],
			after: ["legal.fairUseP2"],
		},
		{
			heading: "legal.enforcement",
			paragraphs: ["legal.enforcementP1"],
			list: ["legal.enforcementL1", "legal.enforcementL2", "legal.enforcementL3"],
			after: ["legal.enforcementP2", "legal.enforcementP3"],
		},
		{
			heading: "legal.usingDashboard",
			paragraphs: ["legal.usingDashboardP1", "legal.usingDashboardP2", "legal.usingDashboardP3"],
		},
		{
			heading: "legal.inBot",
			paragraphs: ["legal.inBotP1"],
		},
		{
			heading: "legal.ending",
			paragraphs: ["legal.endingP1", "legal.endingP2"],
		},
		{
			heading: "legal.changes",
			paragraphs: ["legal.changesP1"],
		},
	],
};

export const PRIVACY: LegalDocument = {
	title: "legal.privacyTitle",
	summary: "legal.privacySummary",
	sections: [
		{
			heading: "legal.operator",
			paragraphs: ["legal.operatorP1"],
		},
		{
			heading: "legal.fromDiscord",
			paragraphs: ["legal.fromDiscordP1"],
		},
		{
			heading: "legal.commands",
			paragraphs: ["legal.commandsP1"],
			list: ["legal.commandsL1", "legal.commandsL2", "legal.commandsL3", "legal.commandsL4", "legal.commandsL5"],
		},
		{
			heading: "legal.stored",
			paragraphs: ["legal.storedP1"],
			list: [
				"legal.storedL1",
				"legal.storedL2",
				"legal.storedL3",
				"legal.storedL4",
				"legal.storedL5",
				"legal.storedL6",
			],
			after: ["legal.storedP2"],
		},
		{
			heading: "legal.messages",
			paragraphs: ["legal.messagesP1", "legal.messagesP2", "legal.messagesP3"],
		},
		{
			heading: "legal.outside",
			paragraphs: ["legal.outsideP1"],
			list: ["legal.outsideL1", "legal.outsideL2", "legal.outsideL3", "legal.outsideL4"],
			after: ["legal.outsideP2"],
		},
		{
			heading: "legal.dashboard",
			paragraphs: [
				"legal.dashboardP1",
				"legal.dashboardP2",
				"legal.dashboardP3",
				"legal.dashboardP4",
				"legal.dashboardP5",
			],
		},
		{
			heading: "legal.blacklist",
			paragraphs: ["legal.blacklistP1"],
		},
		{
			heading: "legal.logConsole",
			paragraphs: ["legal.logConsoleP1"],
		},
		{
			heading: "legal.helpQuestions",
			paragraphs: ["legal.helpQuestionsP1"],
		},
		{
			heading: "legal.retention",
			paragraphs: ["legal.retentionP1"],
			list: [
				"legal.retentionL1",
				"legal.retentionL2",
				"legal.retentionL3",
				"legal.retentionL4",
				"legal.retentionL5",
				"legal.retentionL6",
			],
		},
		{
			heading: "legal.removal",
			paragraphs: ["legal.removalP1", "legal.removalP2"],
		},
		{
			heading: "legal.age",
			paragraphs: ["legal.ageP1"],
		},
		{
			heading: "legal.cookies",
			paragraphs: ["legal.cookiesP1"],
		},
	],
};
