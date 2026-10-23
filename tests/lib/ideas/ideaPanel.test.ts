import { parseCustomId } from "@core/button";
import { type StoredIdea } from "@database/repositories/ideaRepository";
import { decisionText, ideaPost, ideaSettingsPanel, ideaStatusLine } from "@lib/ideas/ideaPanel.util";
import { type IdeaSettings } from "@testify/shared";
import { buttonsOf, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";
const IDEA: StoredIdea = {
	id: "6650a1b2c3d4e5f6a7b8c9d0",
	guildId: "900000000000000001",
	number: 12,
	channelId: "400000000000000001",
	messageId: "500000000000000001",
	authorId: "100000000000000002",
	authorName: "alice",
	text: "A pets channel",
	status: "open",
	reason: "",
	decidedBy: null,
	decidedByName: null,
	decidedAt: null,
	upVoters: ["1", "2", "3"],
	downVoters: ["4"],
	createdAt: new Date("2026-10-20T10:00:00.000Z"),
};
const DECIDED: StoredIdea = {
	...IDEA,
	status: "accepted",
	reason: "Starting Friday.",
	decidedBy: "100000000000000003",
	decidedByName: "kate",
	decidedAt: new Date("2026-10-21T10:00:00.000Z"),
};

const actions = (idea: StoredIdea): string[] => idsOf(ideaPost(idea)).map((id) => parseCustomId(id).action);

describe("a posted idea", () => {
	it("shows the idea, its author and its votes", () => {
		const post = ideaPost(IDEA);

		expect(textOf(post)).toContain("## 💡 Idea #12\nA pets channel");
		expect(textOf(post)).toContain("From <@100000000000000002> (alice)");
		expect(
			buttonsOf(post)
				.slice(0, 2)
				.map((entry) => entry.label),
		).toEqual(["3", "1"]);
	});

	/** Everybody sees the same post, so no button carries an owner the router would hold presses to. */
	it("carries only the idea's own id in its buttons", () => {
		for (const id of idsOf(ideaPost(IDEA))) expect(parseCustomId(id).args).toEqual([IDEA.id]);
	});

	it("offers votes and both decisions while open", () => {
		expect(actions(IDEA)).toEqual(["up", "down", "accept", "decline"]);
	});

	/** A decided idea keeps its count visible, stops taking votes, and can be flipped or reopened. */
	it("closes voting once decided, offering the other decision and a reopen", () => {
		const buttons = buttonsOf(ideaPost(DECIDED));

		expect(actions(DECIDED)).toEqual(["up", "down", "decline", "reopen"]);
		expect(buttons.slice(0, 2).every((entry) => entry.disabled === true)).toBe(true);
	});

	it("says who decided and why", () => {
		expect(ideaStatusLine(DECIDED)).toMatch(/^✅ \*\*Accepted\*\* by kate <t:\d+:R>\n> Starting Friday\.$/);
		expect(ideaStatusLine(IDEA)).toMatch(/Open/);
	});

	it("tells the author what happened, with a link back", () => {
		expect(decisionText(DECIDED, "Test Server", "https://discord.com/x")).toBe(
			"💡 Your idea #12 in **Test Server** was accepted.\n> Starting Friday.\n-# https://discord.com/x",
		);
	});
});

describe("the idea board's settings", () => {
	const settings: IdeaSettings = {
		enabled: false,
		channelId: null,
		canSend: false,
		counts: { open: 2, accepted: 1, declined: 0 },
	};

	it("will not turn on with nowhere to post", () => {
		const toggle = buttonsOf(ideaSettingsPanel(settings, OWNER)).find((entry) =>
			String(entry.custom_id).includes(":toggle:"),
		);

		expect(toggle?.disabled).toBe(true);
	});

	it("puts its opener last in every control, and counts the ideas", () => {
		const panel = ideaSettingsPanel({ ...settings, channelId: "400000000000000001", canSend: true }, OWNER);

		for (const id of idsOf(panel)) expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
		expect(textOf(panel)).toContain("2 open · 1 accepted · 0 declined");
	});

	it("warns when it cannot post in the chosen channel", () => {
		expect(textOf(ideaSettingsPanel({ ...settings, channelId: "400000000000000001" }, OWNER))).toMatch(
			/I cannot post there/,
		);
	});
});
