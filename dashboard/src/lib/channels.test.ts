import { type ChannelSummary } from "@testify/shared";
import { channelLabel, seenChannels } from "@/lib/channels";
import { t } from "@/test/english";

const CHANNELS: ChannelSummary[] = [
	{ id: "400000000000000001", name: "general", kind: "text", position: 1, canSend: true },
	{ id: "400000000000000002", name: null, kind: "text", position: 2, canSend: true },
];

describe("channelLabel", () => {
	/** A channel the reader cannot see was named "a deleted channel", which invited them to replace a working setting. */
	it("tells a channel the reader cannot see apart from one that is gone", () => {
		expect(channelLabel(CHANNELS, "400000000000000001", t)).toBe("#general");
		expect(channelLabel(CHANNELS, "400000000000000002", t)).toBe("a channel you can’t see");
		expect(channelLabel(CHANNELS, "400000000000000009", t, "title")).toBe("A deleted channel");
	});
});

describe("seenChannels", () => {
	it("offers only channels with a name to show", () => {
		expect(seenChannels(CHANNELS).map((channel) => channel.id)).toEqual(["400000000000000001"]);
	});
});
