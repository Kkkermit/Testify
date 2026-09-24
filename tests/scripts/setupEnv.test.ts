import { dashboardFields, type Field, fields } from "../../scripts/setupEnv";

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
		expect(field(questions, "BOT_NAME").check?.("x".repeat(33))).not.toBeNull();
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
