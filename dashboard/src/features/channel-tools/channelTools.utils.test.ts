import { type ToolChannel } from "@testify/shared";
import { restricted, slowmodeChoices, slowmodeText } from "@/features/channel-tools/channelTools.utils";

const channel = (overrides: Partial<ToolChannel>): ToolChannel => ({
	id: "400000000000000001",
	name: "general",
	category: null,
	locked: false,
	slowmodeSeconds: 0,
	canLock: true,
	canSlow: true,
	...overrides,
});

describe("slowmodeText", () => {
	it("names the largest whole unit", () => {
		expect(slowmodeText(5, "en")).toBe("5 seconds");
		expect(slowmodeText(120, "en")).toBe("2 minutes");
		expect(slowmodeText(21_600, "en")).toBe("6 hours");
		expect(slowmodeText(90, "en")).toBe("90 seconds");
	});
});

describe("slowmodeChoices", () => {
	it("keeps a length set in Discord that the list does not offer", () => {
		expect(slowmodeChoices(30)).not.toContain(42);
		expect(slowmodeChoices(42)).toContain(42);
		expect(slowmodeChoices(42).indexOf(42)).toBe(slowmodeChoices(42).indexOf(60) - 1);
	});
});

describe("restricted", () => {
	it("lists the channels that are locked or slowed", () => {
		const list = [channel({ id: "1", locked: true }), channel({ id: "2", slowmodeSeconds: 10 }), channel({ id: "3" })];

		expect(restricted(list).map((entry) => entry.id)).toEqual(["1", "2"]);
	});
});
