import { fillPlaceholders } from "@lib/support/supportArticles.util";
import { findLeak, secretsOf } from "@lib/support/supportGuard.util";
import { FAKE, FAKE_ENV, realEntries } from "@tests/helpers/support";

const ENV = FAKE_ENV;

describe("secretsOf", () => {
	it("holds every secret value, and the password inside the database address on its own", () => {
		const secrets = secretsOf(ENV);

		expect(secrets).toEqual(
			expect.arrayContaining([ENV.DISCORD_TOKEN, ENV.DISCORD_CLIENT_SECRET, ENV.MONGODB_URI, FAKE.databasePassword]),
		);
	});

	it("leaves out a value too short to be worth matching, so a short username cannot censor ordinary words", () => {
		expect(secretsOf({ ...ENV, MONGODB_URI: "mongodb://bot:pw@localhost/testify" })).not.toContain("pw");
	});
});

describe("findLeak", () => {
	const secrets = secretsOf(ENV);

	it("passes ordinary help text", () => {
		expect(findLeak("Run `/levelling setup` and choose **Rewards**. The prefix is t?.", secrets)).toBeNull();
	});

	it.each([
		["secret", `the password is ${FAKE.databasePassword}`],
		["discord-token", `token: ${FAKE.otherDiscordToken}`],
		["credentials-in-url", "connect with mongodb://admin:letmein@db.internal/x"],
		["api-key", `use ${FAKE.otherAnthropicKey}`],
		["api-key", `a ${FAKE.githubToken} token`],
		["private-key", FAKE.privateKey],
		["email", "write to someone@example.com"],
		["discord-id", "the owner is 123456789012345678"],
		["ip-address", "it runs on 10.0.0.12"],
		["env-name", "set DISCORD_TOKEN first"],
		["env-name", "turn on DASHBOARD_ENABLED"],
		["env-file", "open your .env and"],
		["file-path", "logs are in /home/bot/testify"],
	])("names %s", (rule, text) => {
		expect(findLeak(text, secrets)).toBe(rule);
	});

	/** The rule name is what gets logged, so it must never be the value that matched. */
	it("names the rule rather than the value", () => {
		expect(findLeak(`x ${ENV.DISCORD_CLIENT_SECRET} y`, secrets)).toBe("secret");
	});
});

/**
 * Every article and every command page, as a reader would receive it, has to pass: a help article that mentions a
 * variable name, an id or an address is refused at start-up, so this is where the author finds out.
 */
describe("the real help corpus", () => {
	const entries = realEntries();
	const context = { bot: "Testify", prefix: "t?", repository: "https://github.com/Kkkermit/Testify" };

	it("has articles and command pages to check", () => {
		expect(entries.filter((entry) => entry.kind === "article").length).toBeGreaterThan(20);
		expect(entries.filter((entry) => entry.kind === "command").length).toBeGreaterThan(40);
	});

	it.each(entries.map((entry) => [entry.id, entry] as const))("%s holds nothing secret or personal", (_id, entry) => {
		const text = fillPlaceholders(`${entry.title}\n${entry.keywords.join(" ")}\n${entry.body}`, context);

		expect(findLeak(text, secretsOf(ENV))).toBeNull();
	});

	/** An owner command's page would name a control the reader cannot use, and advertise that it exists. */
	it("offers no owner command, and does offer the feedback ones members use", () => {
		const ids = entries.map((entry) => entry.id);

		expect(ids).not.toContain("command-eval");
		expect(ids).not.toContain("command-blacklist");
		expect(ids).toContain("command-bug-report");
	});
});
