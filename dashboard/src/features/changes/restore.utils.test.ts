import { type ChannelSummary, type RoleSummary } from "@testify/shared";
import { describeValue, restoreLines } from "@/features/changes/restore.utils";
import { t } from "@/test/english";

const channels = [{ id: "400000000000000001", name: "welcome" }] as ChannelSummary[];
const roles = [{ id: "300000000000000001", name: "DJ" }] as RoleSummary[];
const lookups = { channels, roles, t };

describe("describeValue", () => {
	/** The reader decides from these whether to put something back, so each reads as its own page shows it. */
	it("words every kind of stored value as the setting's page would", () => {
		const cases: [field: string, value: unknown, expected: string][] = [
			["channelId", null, "Not set"],
			["djRoleIds", [], "Not set"],
			["enabled", true, "On"],
			["selfStar", false, "Off"],
			["channelId", "400000000000000001", "#welcome"],
			["logChannelId", "400000000000000009", "a deleted channel"],
			["djRoleIds", ["300000000000000001", "300000000000000009"], "DJ, A deleted role"],
			["pingRoleId", "300000000000000001", "DJ"],
			["style", "card", "Image card"],
			["frequency", "weekly", "Every week"],
			["bypassPermission", "ManageMessages", "Manage Messages"],
			["cooldownMs", 300_000, "5 minutes"],
			["threshold", 1500, "1,500"],
			["prefix", "t?", "t?"],
		];

		const wrong = cases
			.map(([field, value, expected]) => [field, describeValue(field, value, lookups), expected])
			.filter(([, said, expected]) => said !== expected);

		expect(wrong).toEqual([]);
	});
});

describe("restoreLines", () => {
	it("names each field by its own page's label, with what it holds now and what it goes back to", () => {
		const lines = restoreLines(
			{ action: "starboard.update", put: { threshold: 3 }, expect: { threshold: 5 } },
			lookups,
		);

		expect(lines).toEqual([{ field: "threshold", label: "Stars needed", now: "5", back: "3" }]);
	});
});
