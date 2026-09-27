import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { choiceName, discordMarkdown, suggestionName, supportScreen } from "@lib/support/supportScreen.util";
import { buttonsOf, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";
const OPTIONS = { bot: "Testify", ownerId: OWNER, dashboard: null, supportServer: null };

describe("discordMarkdown", () => {
	it("turns a dashboard path into a full link when the dashboard is on", () => {
		expect(discordMarkdown("Open [your servers](/guilds).", "https://dash.example/")).toBe(
			"Open [your servers](https://dash.example/guilds).",
		);
	});

	it("leaves the words and drops the link when there is no dashboard to send anybody to", () => {
		expect(discordMarkdown("Open [your servers](/guilds).", null)).toBe("Open your servers.");
	});

	it("keeps an allowed outside link and drops one that is not allowed", () => {
		expect(discordMarkdown("[source](https://github.com/Kkkermit/Testify)", null)).toBe(
			"[source](https://github.com/Kkkermit/Testify)",
		);
		expect(discordMarkdown("[prize](https://evil.example/)", null)).toBe("prize");
	});
});

describe("choice names", () => {
	it("puts the topic's emoji in front of a suggestion", () => {
		expect(suggestionName({ id: "music", title: "Playing music", topic: "music" })).toBe("🎵 Playing music");
	});

	/** Discord refuses an autocomplete answer with a name over 100 characters, and then shows nothing at all. */
	it("cuts a name to the 100 characters Discord allows", () => {
		const name = choiceName("x".repeat(150));

		expect(name).toHaveLength(100);
		expect(name.endsWith("…")).toBe(true);
	});
});

describe("supportScreen", () => {
	const answer = {
		id: "add-the-bot",
		title: "Adding Testify",
		topic: "getting-started" as const,
		body: "Open [your servers](/guilds).",
	};
	const related = [{ id: "sign-in", title: "Signing in", topic: "dashboard" as const }];

	it("is a Components V2 message holding the article under its topic", () => {
		const screen = supportScreen({ answer, related: [] }, OPTIONS);

		expect(screen.flags).toBe(MessageFlags.IsComponentsV2);
		expect(textOf(screen)).toContain("Getting started");
		expect(textOf(screen)).toContain("## Adding Testify");
		expect(textOf(screen)).toContain("Open your servers.");
	});

	/** The router checks the last argument against whoever pressed, so a stranger cannot page through your answer. */
	it("puts an Open button beside each related article, with the asker's id last", () => {
		const ids = idsOf(supportScreen({ answer, related }, OPTIONS));

		expect(ids).toHaveLength(1);
		expect(parseCustomId(ids[0] ?? "")).toEqual({ id: "support", action: "open", args: ["sign-in", OWNER] });
	});

	it("links to the Help page and the support server when there are both", () => {
		const screen = supportScreen(
			{ answer, related: [] },
			{ ...OPTIONS, dashboard: "https://dash.example/", supportServer: "https://discord.gg/example" },
		);

		expect(buttonsOf(screen).map((button) => button.url)).toEqual([
			"https://dash.example/help",
			"https://discord.gg/example",
		]);
	});

	it("says what it can help with when nothing matched", () => {
		const text = textOf(supportScreen({ answer: null, related: [] }, { ...OPTIONS, bot: "Helper" }));

		expect(text).toContain("No article for that");
		expect(text).toContain("I can only help with Helper");
		expect(text).not.toContain("open one of these");
	});
});
