/** Written for a self-hosted bot, so the operator is whoever runs it; held as data so a fork edits one file. */

export interface LegalSection {
	heading: string;
	paragraphs: string[];
	list?: string[];
}

export interface LegalDocument {
	title: string;
	summary: string;
	sections: LegalSection[];
}

export const TERMS: LegalDocument = {
	title: "Terms of use",
	summary:
		"Testify is open-source software you or somebody you know is running. These terms cover using this instance of it.",
	sections: [
		{
			heading: "Who runs this",
			paragraphs: [
				"Testify is self-hosted. Whoever deployed this instance — the operator — decides what it does, what it stores and who can reach it. They are responsible for it, not the project's authors.",
				"The software is provided as-is, without warranty of any kind. Nobody promises it will be available, correct, or free of defects.",
			],
		},
		{
			heading: "Using the bot",
			paragraphs: ["By adding Testify to a server or using its commands you agree to the following."],
			list: [
				"Follow Discord's Terms of Service and Community Guidelines. Nothing here overrides them.",
				"Do not use the bot to harass anybody, to break the law, or to evade a moderation action.",
				"Do not try to break, overload or extract data from the bot or the machine it runs on.",
				"A server's moderators, not the bot, are responsible for what happens in that server.",
			],
		},
		{
			heading: "Using the dashboard",
			paragraphs: [
				"You can only configure a server you already have Manage Server in. That permission is checked live on every request, so losing it takes effect immediately.",
				"Every change made here is written to an audit log with your Discord account attached, so the server's other managers can see who changed what.",
			],
		},
		{
			heading: "Economy, levels and other in-bot things",
			paragraphs: [
				"Coins, levels, items and anything else the bot tracks have no monetary value, cannot be exchanged for anything, and may be reset at any time by a server's moderators or by the operator.",
			],
		},
		{
			heading: "Ending it",
			paragraphs: [
				"You can stop using Testify at any time by removing it from your server. When it is removed, the settings it stored for that server are deleted.",
				"The operator may remove the bot from a server, or block an account from using it, at their discretion.",
			],
		},
		{
			heading: "Changes",
			paragraphs: [
				"These terms may change as the software does. The current text is always the one on this page, and the project's history is public.",
			],
		},
	],
};

export const PRIVACY: LegalDocument = {
	title: "Privacy",
	summary:
		"What Testify stores, why, and for how long. It is a short list on purpose — the bot collects the minimum it needs to work.",
	sections: [
		{
			heading: "What is stored",
			paragraphs: ["Testify keeps only what a feature needs to function."],
			list: [
				"Server settings: the prefix, which features are on, which channels and roles they use.",
				"Per-server, per-member records for features you turn on: levels and XP, economy balances and items, warnings, and verification status.",
				"A dashboard session when you sign in: your Discord user id, your username, and your OAuth tokens, encrypted at rest.",
				"An audit record for every change made from the dashboard: who made it, what changed, and when.",
				"Command usage counts: which command, in which server, on which day. No user ids are stored with these.",
				"Dashboard screen counts: which screen was opened and on which day. Counted bot-wide — no user id and no server id is stored with these, so they say which screens get used and nothing about who used them.",
			],
		},
		{
			heading: "What is not stored",
			paragraphs: [
				"Testify does not read or keep your message history. Message content is processed in memory for features you enable — automod, counting, XP — and is never written to the database.",
				"Your Discord password and email are never seen by this bot: signing in goes through Discord's own OAuth, and Testify only receives your id, username, avatar and the servers you are in.",
				"The bot does not sell, share or transmit anything to a third party. It talks to Discord and to its own database, and nothing else.",
			],
		},
		{
			heading: "The log console",
			paragraphs: [
				"The operator can see the bot's recent log lines from the owner console. Anything that looks like a token, password or connection string is removed before a line is stored, and the buffer holds only the last few hundred lines in memory — a restart clears it.",
			],
		},
		{
			heading: "How long it is kept",
			paragraphs: ["Nothing is kept longer than it is useful."],
			list: [
				"Server settings: until the bot is removed from that server, then deleted.",
				"Dashboard sessions: expire on their own, and signing out deletes them immediately.",
				"Audit records and usage counts: 90 days, then deleted automatically.",
				"Levels, balances and other member records: until the server's moderators reset them, or the bot is removed.",
			],
		},
		{
			heading: "Getting your data removed",
			paragraphs: [
				"Removing the bot from a server deletes that server's settings. For anything about you personally, ask the operator of this instance — they run the database and can delete it.",
			],
		},
		{
			heading: "Cookies",
			paragraphs: [
				"One cookie, set when you sign in, holding a signed session identifier. It is httpOnly, same-site, and marked Secure when the dashboard is served over HTTPS. There is no third-party cookie, no advertising identifier, and nothing that follows you between sites. Your IP address is not stored, and neither is your location, your browser or your device.",
			],
		},
	],
};
