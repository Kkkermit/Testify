import { type ChannelSummary } from "@testify/shared";
import { placementOf, postActionOf } from "@/features/bot-stats/botStats.utils";

const general: ChannelSummary = { id: "1", name: "general", kind: "text", position: 1, canSend: true };

describe("placementOf", () => {
	it("says nothing is posted", () => {
		expect(placementOf({ channelId: null }, [general])).toEqual({ kind: "none" });
	});

	it("names the channel it is in", () => {
		expect(placementOf({ channelId: "1" }, [general])).toEqual({ kind: "posted", name: "general" });
	});

	it("says the channel has gone when the server no longer has it", () => {
		expect(placementOf({ channelId: "9" }, [general])).toEqual({ kind: "gone" });
	});
});

describe("postActionOf", () => {
	it("posts when nothing is up yet", () => {
		expect(postActionOf({ channelId: null }, "1")).toBe("post");
	});

	it("reposts in the same channel", () => {
		expect(postActionOf({ channelId: "1" }, null)).toBe("repost");
		expect(postActionOf({ channelId: "1" }, "1")).toBe("repost");
	});

	it("moves to a different channel", () => {
		expect(postActionOf({ channelId: "1" }, "2")).toBe("move");
	});
});
