import { bodyOf, draftProblem, EMPTY_DRAFT } from "@/features/announcements/announcements.utils";

const CHANNEL = "400000000000000001";

describe("draftProblem", () => {
	it("names what is still missing, channel first", () => {
		expect(draftProblem(EMPTY_DRAFT)).toBe("announcements.needChannel");
		expect(draftProblem({ ...EMPTY_DRAFT, channelId: CHANNEL, message: "  " })).toBe("announcements.needMessage");
		expect(draftProblem({ ...EMPTY_DRAFT, channelId: CHANNEL, message: "x".repeat(2_001) })).toBe(
			"announcements.tooLong",
		);
		expect(draftProblem({ ...EMPTY_DRAFT, channelId: CHANNEL, message: "Hi" })).toBeNull();
	});
});

describe("bodyOf", () => {
	/** A form starts at none, so nothing pings unless somebody picked it. */
	it("starts pinging nobody", () => {
		expect(bodyOf({ ...EMPTY_DRAFT, channelId: CHANNEL, message: "Hi" }).mentions).toBe("none");
	});

	it("sends a title and colour only with an embed", () => {
		const draft = { ...EMPTY_DRAFT, channelId: CHANNEL, message: "Hi", title: "News" };

		expect(bodyOf(draft)).toEqual(expect.objectContaining({ title: "News", colour: "#7289da" }));
		expect(bodyOf({ ...draft, style: "text" })).toEqual({
			channelId: CHANNEL,
			style: "text",
			message: "Hi",
			mentions: "none",
		});
	});

	it("leaves an empty title out, so the bot's own default is used", () => {
		expect(bodyOf({ ...EMPTY_DRAFT, channelId: CHANNEL, message: "Hi", title: "   " })).not.toHaveProperty("title");
	});
});
