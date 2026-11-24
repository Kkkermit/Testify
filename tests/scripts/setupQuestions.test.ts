import { chmodSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	analyticsLines,
	dashboardFields,
	type Field,
	fields,
	instanceFields,
	instanceFileText,
	newAuditKey,
	OPERATOR_CONTACT,
	writeSecretFile,
} from "../../scripts/setupQuestions";
import { INSTANCE_DEFAULTS, readInstance } from "@config/instance";
import { isAuditKey } from "@lib/bot/embeddedCollector.util";

function field(list: Field[], key: string): Field {
	const found = list.find((candidate) => candidate.key === key);
	if (found === undefined) throw new Error(`no ${key}`);
	return found;
}

describe("the setup questions", () => {
	/** Every one of these used to be checked only after the last question, so one typo meant starting again. */
	it("catch a malformed answer on the question that asked for it", () => {
		const questions = fields(false);

		expect(field(questions, "DISCORD_CLIENT_ID").check?.("12345")).toMatch(/17 to 20 digits/);
		expect(field(questions, "DISCORD_CLIENT_ID").check?.("100000000000000001")).toBeNull();
		expect(field(questions, "DISCORD_OWNER_IDS").check?.("100000000000000001, 100000000000000002")).toBeNull();
		expect(field(questions, "DISCORD_OWNER_IDS").check?.("100000000000000001, me")).not.toBeNull();
		expect(field(questions, "MONGODB_URI").check?.("localhost:27017")).toMatch(/mongodb:\/\//);
		expect(field(dashboardFields(true), "DASHBOARD_BASE_URL").check?.("http://localhost:5174/")).not.toBeNull();
	});

	it("asks for everything the bot cannot start without", () => {
		const required = fields(false)
			.filter((question) => question.required)
			.map((question) => question.key);

		expect(required).toEqual(["DISCORD_TOKEN", "DISCORD_CLIENT_ID", "DISCORD_OWNER_IDS", "MONGODB_URI"]);
	});

	it("suggests a separate local database for a development bot", () => {
		expect(field(fields(true), "MONGODB_URI").initial).toBe("mongodb://localhost:27017/testify-dev");
	});
});

describe("the analytics question", () => {
	/** Choosing the collector inside the bot must be the whole set-up, with a key the bot accepts. */
	it("writes nothing while off, one switch inside the bot, and the four settings for a collector elsewhere", () => {
		const key = newAuditKey();

		expect(analyticsLines("off", {}, null)).toEqual([]);
		expect(analyticsLines("embedded", {}, null)).toEqual(["", "SHARDLENS_EMBEDDED=true"]);
		expect(analyticsLines("embedded", {}, key)).toEqual(["", "SHARDLENS_EMBEDDED=true", `SHARDLENS_AUDIT_KEY=${key}`]);
		expect(isAuditKey(key)).toBe(true);
		expect(analyticsLines("collector", { SHARDLENS_URL: "https://stats.example.com" }, null)).toEqual([
			"",
			"SHARDLENS_URL=https://stats.example.com",
			"SHARDLENS_INGEST_KEY=",
			"SHARDLENS_READ_KEY=",
			"SHARDLENS_ACTIVITY_KEY=",
		]);
		expect(fields(false).some((question) => question.key.startsWith("SHARDLENS_"))).toBe(false);
	});
});

describe("making it your own", () => {
	/** A wizard that wrote a file the bot then refused would turn the friendly path into a failed start. */
	it("checks each answer with the rule the bot reads the file with", () => {
		const questions = instanceFields();

		expect(field(questions, "repository").check?.("https://gitlab.com/me/fork")).toMatch(/GitHub repository/);
		expect(field(questions, "repository").check?.("https://github.com/me/fork")).toBeNull();
		expect(field(questions, "supportServer").check?.("none")).toBeNull();
		expect(field(questions, "defaultPrefix").check?.("t ?")).toMatch(/space/);
		expect(OPERATOR_CONTACT.check?.("javascript:alert(1)")).toMatch(/email address or an https/);
	});

	it("writes only what was answered, which the bot then reads back", () => {
		const text = instanceFileText({
			"operator.name": "Sam's Servers",
			"operator.contact": "privacy@example.com",
			supportServer: "none",
			repository: "",
			defaultPrefix: "!",
		});
		const path = join(mkdtempSync(join(tmpdir(), "testify-wizard-")), "testify.config.json");
		writeFileSync(path, text ?? "", "utf8");

		expect(readInstance({ name: "testify.config.json", path, exists: true })).toEqual({
			...INSTANCE_DEFAULTS,
			operator: { name: "Sam's Servers", contact: "privacy@example.com" },
			supportServer: null,
			defaultPrefix: "!",
		});
		expect(instanceFileText({ repository: " " })).toBeNull();
	});
});

describe("writing the answers", () => {
	/** A mode given to a write applies only to a file it creates, and `.env` is often copied from the example first. */
	it("leaves the settings file readable by its owner alone, even one that was already there", () => {
		const path = join(mkdtempSync(join(tmpdir(), "testify-wizard-")), ".env");
		writeFileSync(path, "OLD=1\n", { mode: 0o644 });
		chmodSync(path, 0o644);

		writeSecretFile(path, "DISCORD_TOKEN=secret\n");

		expect(readFileSync(path, "utf8")).toBe("DISCORD_TOKEN=secret\n");
		// Windows keeps no such mode, so there is nothing more to check there.
		if (process.platform !== "win32") expect(statSync(path).mode & 0o777).toBe(0o600);
	});
});
