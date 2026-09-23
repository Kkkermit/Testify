import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { discordMarkdown, supportScreen } from "@lib/support/supportScreen.util";
import { idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";

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

describe("supportScreen", () => {
	const answer = { id: "add-the-bot", title: "Adding Testify", body: "Open [your servers](/guilds)." };
	const related = [{ id: "sign-in", title: "Signing in" }];

	it("is a Components V2 message holding the article", () => {
		const screen = supportScreen({ answer, related: [] }, { bot: "Testify", ownerId: OWNER, dashboard: null });

		expect(screen.flags).toBe(MessageFlags.IsComponentsV2);
		expect(textOf(screen)).toContain("## Adding Testify");
		expect(textOf(screen)).toContain("Open your servers.");
	});

	/** The router checks the last argument against whoever pressed, so a stranger cannot page through your answer. */
	it("puts an Open button beside each related article, with the asker's id last", () => {
		const ids = idsOf(supportScreen({ answer, related }, { bot: "Testify", ownerId: OWNER, dashboard: null }));

		expect(ids).toHaveLength(1);
		expect(parseCustomId(ids[0] ?? "")).toEqual({ id: "support", action: "open", args: ["sign-in", OWNER] });
	});

	it("says what it can help with when nothing matched", () => {
		const text = textOf(
			supportScreen({ answer: null, related: [] }, { bot: "Helper", ownerId: OWNER, dashboard: null }),
		);

		expect(text).toContain("No article for that");
		expect(text).toContain("I can only help with Helper");
		expect(text).not.toContain("open one of these");
	});
});
