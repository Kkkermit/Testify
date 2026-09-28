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
	/** The day the text last changed, which the page prints above it. */
	updated: string;
	glance: { label: TranslationKey; value: TranslationKey }[];
	sections: LegalSection[];
}

/** A section's anchor, taken from its heading key so a link to it survives a translation. */
export function sectionId(section: LegalSection): string {
	return section.heading.replace("legal.", "");
}

/** Moves whenever either document's wording does, because the page prints it as the date the text last changed. */
export const LEGAL_UPDATED = "2026-09-27";

export const TERMS: LegalDocument = {
	title: "legal.termsTitle",
	summary: "legal.termsSummary",
	updated: LEGAL_UPDATED,
	glance: [
		{ label: "legal.termsGlanceWho", value: "legal.termsGlanceWhoV" },
		{ label: "legal.termsGlanceRules", value: "legal.termsGlanceRulesV" },
		{ label: "legal.termsGlanceBroken", value: "legal.termsGlanceBrokenV" },
		{ label: "legal.termsGlanceCoins", value: "legal.termsGlanceCoinsV" },
	],
	sections: [
		{
			heading: "legal.accept",
			paragraphs: ["legal.acceptP1"],
		},
		{
			heading: "legal.about",
			paragraphs: ["legal.aboutP1"],
			list: ["legal.aboutL1", "legal.aboutL2", "legal.aboutL3", "legal.aboutL4", "legal.aboutL5", "legal.aboutL6"],
			after: ["legal.aboutP2"],
		},
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
			heading: "legal.yourContent",
			paragraphs: ["legal.yourContentP1"],
		},
		{
			heading: "legal.availability",
			paragraphs: ["legal.availabilityP1", "legal.availabilityP2"],
		},
		{
			heading: "legal.thirdParty",
			paragraphs: ["legal.thirdPartyP1"],
		},
		{
			heading: "legal.liability",
			paragraphs: ["legal.liabilityP1"],
		},
		{
			heading: "legal.ending",
			paragraphs: ["legal.endingP1", "legal.endingP2"],
		},
		{
			heading: "legal.changes",
			paragraphs: ["legal.changesP1"],
		},
		{
			heading: "legal.severability",
			paragraphs: ["legal.severabilityP1"],
		},
		{
			heading: "legal.contact",
			paragraphs: ["legal.contactP1"],
		},
	],
};

export const PRIVACY: LegalDocument = {
	title: "legal.privacyTitle",
	summary: "legal.privacySummary",
	updated: LEGAL_UPDATED,
	glance: [
		{ label: "legal.privacyGlanceWhat", value: "legal.privacyGlanceWhatV" },
		{ label: "legal.privacyGlanceWhy", value: "legal.privacyGlanceWhyV" },
		{ label: "legal.privacyGlanceHow", value: "legal.privacyGlanceHowV" },
		{ label: "legal.privacyGlanceChoice", value: "legal.privacyGlanceChoiceV" },
	],
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
			list: [
				"legal.commandsL1",
				"legal.commandsL2",
				"legal.commandsL3",
				"legal.commandsL6",
				"legal.commandsL4",
				"legal.commandsL5",
			],
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
				"legal.storedL7",
			],
			after: ["legal.storedP2"],
		},
		{
			heading: "legal.messages",
			paragraphs: ["legal.messagesP1", "legal.messagesP2", "legal.messagesP3"],
		},
		{
			heading: "legal.purposes",
			paragraphs: ["legal.purposesP1"],
			list: [
				"legal.purposesL1",
				"legal.purposesL2",
				"legal.purposesL3",
				"legal.purposesL4",
				"legal.purposesL5",
				"legal.purposesL6",
			],
			after: ["legal.purposesP2"],
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
				"legal.retentionL7",
			],
		},
		{
			heading: "legal.storage",
			paragraphs: ["legal.storageP1", "legal.storageP2"],
		},
		{
			heading: "legal.breach",
			paragraphs: ["legal.breachP1"],
		},
		{
			heading: "legal.removal",
			paragraphs: ["legal.rightsP1"],
			list: ["legal.rightsL1", "legal.rightsL2", "legal.rightsL3", "legal.rightsL4", "legal.rightsL5"],
			after: ["legal.removalP1", "legal.removalP2"],
		},
		{
			heading: "legal.legalBasis",
			paragraphs: ["legal.legalBasisP1"],
		},
		{
			heading: "legal.age",
			paragraphs: ["legal.ageP1"],
		},
		{
			heading: "legal.cookies",
			paragraphs: ["legal.cookiesP1"],
		},
		{
			heading: "legal.privacyChanges",
			paragraphs: ["legal.privacyChangesP1"],
		},
		{
			heading: "legal.contact",
			paragraphs: ["legal.privacyContactP1"],
		},
	],
};
