import { type ChannelSummary, type GuildInbox } from "@testify/shared";
import { channelProblemText, inboxSummary, moreThan } from "@/features/inbox/inbox.utils";
import { t } from "@/test/english";

const empty: GuildInbox = {
	tickets: { total: 0, items: [] },
	ideas: { total: 0, items: [] },
	permissions: [],
	channels: [],
};

const channels: ChannelSummary[] = [
	{ id: "1", name: "general", kind: "text", position: 0, parentId: null, canSend: false },
	{ id: "2", name: null, kind: "text", position: 1, parentId: null, canSend: false },
];

describe("inboxSummary", () => {
	it("counts everything waiting, and says so plainly when nothing is", () => {
		expect(inboxSummary(empty, t)).toBe("Nothing needs you right now.");
		expect(inboxSummary({ ...empty, tickets: { total: 3, items: [] }, permissions: ["ManageRoles"] }, t)).toBe(
			"4 things need you.",
		);
	});
});

describe("moreThan", () => {
	it("never goes below nothing", () => {
		expect(moreThan({ total: 2, items: [1, 2] })).toBe(0);
		expect(moreThan({ total: 9, items: [1, 2] })).toBe(7);
	});
});

describe("channelProblemText", () => {
	/** A channel the reader cannot see in Discord is never named on the web either. */
	it("names a channel the reader can see and leaves one they cannot unnamed", () => {
		const at = { feature: "welcome", label: "Welcome", problem: "cannotPost" } as const;

		expect(channelProblemText({ ...at, channelId: "1" }, channels, t)).toBe("Welcome messages cannot post in #general");
		expect(channelProblemText({ ...at, channelId: "2" }, channels, t)).not.toContain("#");
	});
});
