import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { screen, within } from "@testing-library/react";
import { type LegalDocument, PRIVACY, sectionId, TERMS } from "@/features/legal/legal.content";
import { LegalPage } from "@/features/legal/LegalPage";
import en from "@/i18n/locales/en.json";
import { expectNoViolations } from "@/test/axe";
import { t } from "@/test/english";
import { renderWithProviders } from "@/test/renderWithProviders";

const RealDateTimeFormat = Intl.DateTimeFormat;

// A reader in New York: every formatter that names no zone of its own formats in theirs.
beforeAll(() => {
	jest
		.spyOn(Intl, "DateTimeFormat")
		.mockImplementation(
			(locale, options) => new RealDateTimeFormat(locale, { timeZone: "America/New_York", ...options }),
		);
});

afterAll(() => {
	jest.restoreAllMocks();
});

/** The documents are translation keys, so the prose under test is what English resolves them to. */
function english(key: string): string {
	return (en.legal as Record<string, string>)[key.replace("legal.", "")] ?? key;
}

function prose(document: LegalDocument): string {
	return [
		...document.glance.map((row) => row.value),
		...document.sections.flatMap((section) => [
			...section.paragraphs,
			...(section.list ?? []),
			...(section.after ?? []),
		]),
	]
		.map(english)
		.join(" ");
}

/** A file in the bot, read as text, so a claim about it breaks when the number it states changes. */
function botSource(path: string): string {
	return readFileSync(resolve(__dirname, "../../../..", path), "utf8");
}

describe("the legal pages", () => {
	it.each([
		["terms", TERMS],
		["privacy", PRIVACY],
	])("renders every section of the %s", (path, document) => {
		renderWithProviders(<LegalPage document={document} />, { path: `/${path}` });

		expect(screen.getByRole("heading", { level: 1, name: english(document.title) })).toBeInTheDocument();
		document.sections.forEach((section, index) => {
			const name = `${String(index + 1)}. ${t(section.heading)}`;
			expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
		});
	});

	/** One document with a contents list, rather than a card per section the reader has to scroll past. */
	it("links every section from the contents", () => {
		renderWithProviders(<LegalPage document={PRIVACY} />, { path: "/privacy" });

		const contents = screen.getByRole("navigation", { name: "Contents" });
		PRIVACY.sections.forEach((section, index) => {
			const link = within(contents).getByRole("link", { name: `${String(index + 1)}. ${t(section.heading)}` });
			expect(link).toHaveAttribute("href", `#${sectionId(section)}`);
			expect(document.getElementById(sectionId(section))).not.toBeNull();
		});
	});

	/** The date is a stored day, and read as a local moment it showed the day before to anybody west of UTC. */
	it("says when the text last changed, and sums it up before the detail", () => {
		renderWithProviders(<LegalPage document={TERMS} />, { path: "/terms" });

		expect(screen.getByText("Last updated 21 Nov 2026")).toBeInTheDocument();
		expect(screen.getByRole("heading", { level: 2, name: "At a glance" })).toBeInTheDocument();
		expect(screen.getByText(english("legal.termsGlanceCoinsV"))).toBeInTheDocument();
	});

	/** The claims the code has to keep true, so a change that breaks one breaks a test. */
	it("says what the code actually does", () => {
		const text = prose(PRIVACY);

		expect(text).toMatch(/Messages in servers are never stored/);
		// `directMessageLog.event.ts` writes a DM into the database, so the notice has to say so.
		expect(text).toMatch(/Direct messages are the exception/);
		expect(text).toMatch(/encrypted at rest/i);
		// `recordScreenView` sends a route alone, and the server only beside one of its managers, never the person.
		expect(botSource("src/lib/bot/shardlens.util.ts")).toMatch(/lens\.track\(LENS_EVENTS\.screen, \{ route \}\)/);
		expect(text).toMatch(/with no user id and no server id/i);
		expect(text).toMatch(/IP address is not stored/i);
		expect(text).toMatch(/Server counts: .* Shardlens is told the server and the screen, never who opened it/);
		// `/remind me`'s `about` is `unlogged`, and `deliverDueReminders` deletes each one once it is sent.
		expect(text).toMatch(/A reminder’s text is never posted to the operator’s command logs/);
		expect(text).toMatch(/Reminders: deleted once delivered or cancelled/);
		// `voteOnIdea` keeps who voted which way, which is what stops a second vote; `purgeGuild` removes the board.
		expect(text).toMatch(/Ideas: .* who voted for and against it/);
		expect(text).toMatch(/Ideas and their votes: .* the bot is removed from the server/);
		// `claimStarPost` stores ids and a count, and `countStars` reads the voters without keeping them.
		expect(text).toMatch(/Starboard: .* Never its text, .* and never who starred it/);
		expect(text).toMatch(/Starboard records: deleted with the original message/);
		// `recordTempChannel` keeps the channel and the member it was made for; `closeIfEmpty` forgets both.
		expect(text).toMatch(/Join to create: .* the user id of the member it was made for/);
		expect(text).toMatch(/Join-to-create channels: forgotten once the channel is deleted/);
		// `/afk`'s note is `unlogged`, and `clearAfk` runs on the member's next message.
		expect(text).toMatch(/Away notes: .* The note is never posted to the operator’s command logs/);
		// Goodbye, auto-responder and scheduled message records each carry `updatedBy`, and `purgeGuild` removes all three.
		expect(text).toMatch(/Goodbye messages, auto-responders and scheduled messages: .* who last changed each/);
		expect(text).toMatch(/A scheduled message that posts once is deleted once it is posted/);
		// `shareBirthday` keeps a day and a month with no year, and `forgetLeaver` drops it when the member leaves.
		expect(text).toMatch(/Birthdays: the day and month .* never the year/);
		expect(text).toMatch(/Birthdays: until you remove yours .* you leave that server/);
		// `recordCase` names the member and the moderator, and `purgeCaseSettings` keeps the cases themselves.
		expect(text).toMatch(/Moderation cases: .* the member’s user id and username, the moderator’s/);
		expect(text).toMatch(/Moderation cases: kept like warnings after the bot is removed/);
		// `JoinWatch` lives in memory, and `raidsettings` holds nothing about any member.
		expect(text).toMatch(/Raid protection: only its settings\. .* never stored/);
		// The support desk logs no question and keeps none; `supportDesk.test.ts` pins the log half in the bot.
		expect(text).toMatch(/It is not stored, and it is not written to the log/);
		expect(text).toMatch(/sent to Anthropic/);
		// `startShardlens` asks for audit mode and values only of fixed choices, and `eraseAccount` asks the collector to forget.
		const lens = botSource("src/lib/bot/shardlens.util.ts");
		expect(lens).toMatch(/mode: "audit"/);
		expect(lens).toMatch(/captureOptionValues: choices,/);
		expect(botSource("src/lib/account/accountActions.util.ts")).toContain("shardlens?.forgetUser(userId)");
		expect(text).toMatch(
			/the names of the options you filled in and, for one with a fixed list, the choice you picked, but never what you typed/,
		);
		// The spool holds what the SDK has not sent, which it writes hashed and without an audit identity.
		expect(lens).toMatch(/spool: \{ dir: spoolFor\(client, target\) \}/);
		expect(text).toMatch(/kept in a folder on the bot’s own machine, hashed and without who ran it, until it is sent/);
		expect(text).toMatch(/unless the operator has put their collector in audit mode: then your user id, username/);
		// Who ran what reaches the console only through the activity key, on owner-only routes the collector logs.
		expect(botSource("src/lib/bot/shardlensReader.util.ts")).toMatch(
			/this\.#activity = clientFor\(target\.activityKey\)/,
		);
		expect(botSource("src/api/routes/analytics.ts")).toMatch(/analytics\.use\("\*", requireOwner\)/);
		expect(text).toMatch(/by the bot’s owners in its owner console if the operator has given the bot an activity key/);
		expect(text).not.toMatch(/only the people who can sign in to it can see who ran what/);
		// The collector inside the bot keeps everything in the bot's own database, and names people only with the audit key.
		const inBot = botSource("src/lib/bot/mongoCollector.util.ts");
		expect(inBot).toMatch(/uri: env\.MONGODB_URI,/);
		expect(inBot).toMatch(/auditKey === undefined \? \{\} : \{ mode: "audit" as const, auditKey \}/);
		expect(text).toMatch(/which can run inside the bot and keep them in the bot’s own database\./);
		expect(text).toMatch(
			/on the operator’s own collector, which can run inside the bot and keep them in the bot’s own database/,
		);
		expect(text).not.toMatch(/nothing leaves its machine/);
		// A prefix run is the SDK's own message command, sent with its actor in audit mode like any other.
		expect(lens).toMatch(/trackMessageCommand\(message, \{\s*command: run\.command,/);
		expect(text).toMatch(/sent with each command, button and form, prefix commands included/);
		expect(text).not.toMatch(/prefix command is never named/i);
		expect(text).toMatch(/under your hashed id, and in audit mode under your user id as well/);
		// `recordPrefixRun` sends a value only for a fixed choice, and `recordEvent` passes the server and never a user.
		expect(lens).toMatch(/option\.value !== null && choices\.has\(option\.name\)/);
		expect(text).toMatch(/the names of the options you gave it and, for one with a fixed list, the choice you picked/);
		expect(lens).toMatch(/track\(event, values, context\(guildId\)\)/);
		expect(lens).not.toMatch(/userId/);
		expect(text).toMatch(/counts what the bot does with nobody named: .* but never the question/);
		expect(text).toMatch(/Each of those carries the server it happened in and never who/);
		expect(lens).toMatch(/refreshGuildCounts: true/);
		expect(text).toMatch(/member count, kept current while the bot runs/);
		// `markNoticesSeen` and `markNoticeHinted` write two times against a user id, in a record tied to no server.
		expect(text).toMatch(
			/keeps when you last read them and when it last told you about one, against your user id and nothing else/,
		);
		// `ERASURE` keeps the blacklist, warnings, cases and softbans about somebody, and anonymises what they did as staff.
		const erasure = botSource("src/database/repositories/accountRepository.ts");
		expect(erasure).toMatch(/blacklist: \{ userId: "keep" \}/);
		expect(erasure).toMatch(/modcases: \{ userId: "keep", moderatorId: "anonymise" \}/);
		// `startShardlens` hands the stored opt-outs to the SDK, and `ERASURE` keeps them when the rest is deleted.
		expect(lens).toMatch(/optedOut,/);
		expect(text).toMatch(/so the bot keeps leaving you out of Shardlens analytics after a restart/);
		expect(erasure).toMatch(/analyticsoptouts: \{ userId: "keep" \}/);
		expect(text).toMatch(/Deleting your data keeps it, so you are not counted again/);
		expect(text).toMatch(/delete their own data at any time.* can’t be undone/);
		// `recordsSettings` writes a change made with a command to the same audit log, with the person who made it.
		expect(text).toMatch(/A setting you change with one of .* commands in Discord is recorded the same way/);
		// `/delete-my-data` is private and asks for the username before anything goes; `deleteMyData.test.ts` pins both.
		expect(botSource("src/commands/info/deleteMyData.command.ts")).toMatch(/private: true/);
		expect(text).toMatch(/with \/delete-my-data in Discord, whose answer only the person who ran it can see/);
		expect(text).toMatch(/Both ask you to confirm with your username/);
		// `blacklistWriters.test.ts` fails on anything but the owner command and the owner console changing the list.
		expect(text).toMatch(/only the bot’s owners can add or lift a block/);
		expect(text).toMatch(/Warnings, cases, softbans and blocks against you are kept/);
		expect(text).toMatch(/stays with your name taken off/);
		// `directMessageLog` skips a sender with a conversation open, which `modmail.test.ts` proves.
		expect(botSource("src/events/message/directMessageLog.event.ts")).toContain("openConversationOf");
		expect(text).toMatch(/is not forwarded to the operator/);
		// `purgeGuild` keeps member records, so the notice must not promise they go with the bot.
		expect(text).toMatch(/every member record .* kept after the bot is removed/);
	});

	/** Each number the notice states is read out of the code that decides it. */
	it("states the numbers the bot actually uses", () => {
		const text = prose(PRIVACY);
		const constants = botSource("src/config/constants.ts");

		const retention = /AUDIT = \{ retentionDays: (\d+) \}/.exec(constants)?.[1];
		expect(text).toContain(`Audit records: ${String(retention)} days`);

		const away = /keepDays: (\d+)/.exec(constants)?.[1];
		expect(text).toContain(
			`Away notes: deleted when you next send a message in that server, or after ${String(away)} days`,
		);

		const readers = /readerDays: (\d+)/.exec(botSource("shared/src/notices.ts"))?.[1];
		expect(text).toContain(`When you last read the notifications: ${String(readers)} days`);
		expect(text).toContain(`deleted ${String(readers)} days after you last read the notifications`);

		const appeals = /keepDays: (\d+)/.exec(botSource("shared/src/appeals.ts"))?.[1];
		expect(text).toContain(`Ban appeals: ${String(appeals)} days after staff decide`);

		const modmail = /keepDays: (\d+)/.exec(botSource("shared/src/modmail.ts"))?.[1];
		expect(text).toContain(`Mod mail conversations: ${String(modmail)} days after they close`);

		const invites = /keepDays: (\d+)/.exec(botSource("shared/src/invites.ts"))?.[1];
		expect(text).toContain(`Invite tracking: ${String(invites)} days after each join`);

		expect(text).toContain(`change records for ${String(retention)} days`);
		expect(botSource("src/database/models/dashboardAudit.schema.ts")).toContain("AUDIT.retentionDays * 24 * 60 * 60");

		const logs = botSource("shared/src/logs.ts");
		const starts = /runsKept: (\d+)/.exec(logs)?.[1];
		const perRun = Number(/linesPerRun: ([\d_]+)/.exec(logs)?.[1]?.replace("_", ""));
		expect(text).toContain(
			`for its last ${String(starts)} starts, at most ${perRun.toLocaleString("en-GB")} lines each`,
		);
		expect(text).toContain(
			`Log lines: the bot’s last ${String(starts)} starts, at most ${perRun.toLocaleString("en-GB")} lines`,
		);

		const seconds = Number(
			/expireAfterSeconds: (\d+)/.exec(botSource("src/database/models/verification.schema.ts"))?.[1],
		);
		expect(text).toContain(`Verification codes: ${String(seconds / 60)} minutes`);

		const maxDays = /DASHBOARD_SESSION_TTL_DAYS: .*\.max\((\d+)\)/.exec(botSource("src/config/env.ts"))?.[1];
		expect(text).toContain(`up to ${String(maxDays)}`);

		for (const scope of /const SCOPES = "([^"]+)"/.exec(botSource("src/api/discord.ts"))?.[1]?.split(" ") ?? []) {
			expect(text).toContain(`${scope}, for`);
		}
	});

	it("warns that spam and abuse can get an account blacklisted", () => {
		const text = prose(TERMS);

		expect(text).toMatch(/Sending commands, pressing buttons or triggering prefix commands far more often/);
		expect(text).toMatch(/several accounts .* get round a cooldown/);
		expect(text).toMatch(/Exploiting a bug/);
		expect(text).toMatch(/Blacklisting your account\. A blacklisted account is refused every command/);
	});

	/** A self-hosted bot has no single company behind it, so every duty lands on whoever runs this instance. */
	it("names the operator as the one to ask, and what they can be asked for", () => {
		const privacy = prose(PRIVACY);

		expect(privacy).toMatch(/the operator is the controller of this data/);
		expect(privacy).toMatch(/A copy of what is stored about you/);
		expect(privacy).toMatch(/Nothing is sold, shared for advertising/);
		expect(prose(TERMS)).toMatch(/neither the operator nor the project’s authors are liable/);
	});

	/** The terms repeat what LICENSE grants, so a change of licence has to change them too. */
	it("names the licence the code is published under", () => {
		const licence = botSource("LICENSE");

		expect(licence).toMatch(/^MIT License\n\nCopyright \(c\) [\d-]+ Kkermit/);
		expect(licence).toContain("The above copyright notice and this permission notice shall be included in all");
		expect(prose(TERMS)).toMatch(/published under the MIT licence/);
		expect(prose(TERMS)).toMatch(/copyright notice naming its original author and the licence itself are kept/);
	});

	/** A paragraph that sums up a list has to come after it, or it reads as introducing the wrong thing. */
	it("renders a closing paragraph after its list", () => {
		renderWithProviders(<LegalPage document={TERMS} />, { path: "/terms" });

		const lastRule = screen.getByText(english("legal.fairUseL5"));
		const closing = screen.getByText(english("legal.fairUseP2"));
		expect(lastRule.compareDocumentPosition(closing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it("offers a way back to the dashboard", () => {
		renderWithProviders(<LegalPage document={TERMS} />, { path: "/terms" });

		expect(screen.getByRole("link", { name: /back to the dashboard/i })).toHaveAttribute("href", "/guilds");
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderWithProviders(<LegalPage document={PRIVACY} />, { path: "/privacy" });

		await expectNoViolations(container);
	});
});

describe("where the legal pages sit", () => {
	/** Somebody deciding whether to add the bot has to be able to read these before signing in. */
	it("is outside the sign-in gate", async () => {
		const { routes } = await import("@/routes");
		const paths = routes.map((route) => ("path" in route ? route.path : undefined));

		expect(paths).toContain("/terms");
		expect(paths).toContain("/privacy");
	});
});
