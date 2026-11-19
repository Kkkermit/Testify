import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	dashboardFields,
	type Field,
	fields,
	instanceFields,
	instanceFileText,
	OPERATOR_CONTACT,
} from "../../scripts/setupEnv";
import { INSTANCE_DEFAULTS, readInstance } from "@config/instance";

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
