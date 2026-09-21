import { type TranslationKey } from "@/i18n";

/** The documents as keys rather than prose: a fork edits one dictionary, and every language carries both. */

export interface LegalSection {
	heading: TranslationKey;
	paragraphs: TranslationKey[];
	list?: TranslationKey[];
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
		{ heading: "legal.whoRuns", paragraphs: ["legal.whoRunsP1", "legal.whoRunsP2"] },
		{
			heading: "legal.usingBot",
			paragraphs: ["legal.usingBotP1"],
			list: ["legal.usingBotL1", "legal.usingBotL2", "legal.usingBotL3", "legal.usingBotL4"],
		},
		{ heading: "legal.usingDashboard", paragraphs: ["legal.usingDashboardP1", "legal.usingDashboardP2"] },
		{ heading: "legal.inBot", paragraphs: ["legal.inBotP1"] },
		{ heading: "legal.ending", paragraphs: ["legal.endingP1", "legal.endingP2"] },
		{ heading: "legal.changes", paragraphs: ["legal.changesP1"] },
	],
};

export const PRIVACY: LegalDocument = {
	title: "legal.privacyTitle",
	summary: "legal.privacySummary",
	sections: [
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
		},
		{
			heading: "legal.notStored",
			paragraphs: ["legal.notStoredP1", "legal.notStoredP2", "legal.notStoredP3"],
		},
		{ heading: "legal.logConsole", paragraphs: ["legal.logConsoleP1"] },
		{
			heading: "legal.retention",
			paragraphs: ["legal.retentionP1"],
			list: ["legal.retentionL1", "legal.retentionL2", "legal.retentionL3", "legal.retentionL4"],
		},
		{ heading: "legal.removal", paragraphs: ["legal.removalP1"] },
		{ heading: "legal.cookies", paragraphs: ["legal.cookiesP1"] },
	],
};
