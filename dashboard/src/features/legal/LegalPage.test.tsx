import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { screen } from "@testing-library/react";
import { type LegalDocument, PRIVACY, TERMS } from "@/features/legal/legal.content";
import { LegalPage } from "@/features/legal/LegalPage";
import en from "@/i18n/locales/en.json";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";

/** The documents are keys now, so the prose a reader sees is what English resolves them to. */
function english(key: string): string {
	return (en.legal as Record<string, string>)[key.replace("legal.", "")] ?? key;
}

function prose(document: LegalDocument): string {
	return document.sections
		.flatMap((section) => [...section.paragraphs, ...(section.list ?? []), ...(section.after ?? [])])
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
		for (const section of document.sections) {
			expect(screen.getByRole("heading", { level: 2, name: english(section.heading) })).toBeInTheDocument();
		}
	});

	/** The claims the code has to keep true, so a change that breaks one breaks a test. */
	it("says what the code actually does", () => {
		const text = prose(PRIVACY);

		expect(text).toMatch(/Messages in servers are never stored/);
		// `directMessageLog.event.ts` writes a DM into the database, so the notice has to say so.
		expect(text).toMatch(/Direct messages are the exception/);
		expect(text).toMatch(/No user ids are stored/i);
		expect(text).toMatch(/encrypted at rest/i);
		// Screen counts carry neither, which is the whole reason they are safe to keep.
		expect(text).toMatch(/no user id and no server id is stored/i);
		expect(text).toMatch(/IP address is not stored/i);
		// The support desk logs no question and keeps none; `supportDesk.test.ts` pins the log half in the bot.
		expect(text).toMatch(/It is not stored, and it is not written to the log/);
		expect(text).toMatch(/sent to Anthropic/);
		// `purgeGuild` keeps member records, so the notice must not promise they go with the bot.
		expect(text).toMatch(/every member record .* kept after the bot is removed/);
	});

	/** Each number the notice states is read out of the code that decides it. */
	it("states the numbers the bot actually uses", () => {
		const text = prose(PRIVACY);
		const constants = botSource("src/config/constants.ts");

		const retention = /retentionDays: (\d+)/.exec(constants)?.[1];
		expect(text).toContain(`Audit records, command usage and screen counts: ${String(retention)} days`);
		expect(botSource("src/database/models/dashboardAudit.schema.ts")).toContain(`${String(retention)} * 24 * 60 * 60`);

		const ring = Number(/logRingCapacity: ([\d_]+)/.exec(constants)?.[1]?.replace("_", ""));
		expect(text).toContain(`last ${ring.toLocaleString("en-GB")} lines`);

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
