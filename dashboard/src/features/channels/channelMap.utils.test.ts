import { type ChannelSummary } from "@testify/shared";
import { channelTree, featuresIn } from "@/features/channels/channelMap.utils";
import { guildPlaces } from "@/test/fixtures/server";

function channel(
	id: string,
	kind: ChannelSummary["kind"],
	position: number,
	parentId: string | null = null,
	name: string | null = `c${id}`,
): ChannelSummary {
	return { id, name, kind, position, parentId, canSend: true };
}

describe("channelTree", () => {
	/** Discord lists loose channels first, then each category by position, text before voice inside each. */
	it("orders channels the way Discord's own list does", () => {
		const tree = channelTree([
			channel("20", "category", 2, null, "Voice"),
			channel("10", "category", 1, null, "Chat"),
			channel("1", "voice", 0, "10"),
			channel("2", "text", 5, "10"),
			channel("3", "announcement", 1, "10"),
			channel("4", "text", 0),
			channel("5", "voice", 0, "20"),
		]);

		expect(tree.map((group) => [group.category?.name ?? null, group.channels.map((c) => c.id)])).toEqual([
			[null, ["4"]],
			["Chat", ["3", "2", "1"]],
			["Voice", ["5"]],
		]);
	});

	/** A channel the reader cannot see is named nowhere, so it is left out rather than drawn without a name. */
	it("leaves out channels the reader cannot see, and categories with nothing left in them", () => {
		const tree = channelTree([
			channel("10", "category", 1, null, "Staff"),
			channel("1", "text", 0, "10", null),
			channel("2", "text", 1, null, null),
			channel("3", "other", 2),
		]);

		expect(tree).toEqual([]);
	});

	/** A channel whose category the reader cannot see still belongs together with its siblings. */
	it("keeps a hidden category's visible channels together, without a name", () => {
		const tree = channelTree([channel("10", "category", 1, null, null), channel("1", "text", 0, "10")]);

		expect(tree).toEqual([{ category: { id: "10", name: null }, channels: [expect.objectContaining({ id: "1" })] }]);
	});
});

describe("featuresIn", () => {
	it("lists what works in one channel and nothing from any other", () => {
		expect(featuresIn(guildPlaces.features, "400000000000000002").map((feature) => feature.key)).toEqual(["tickets"]);
	});
});
