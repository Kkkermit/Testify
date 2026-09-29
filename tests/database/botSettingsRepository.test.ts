import { BotSettingsConfig } from "@database/models/botSettings.schema";
import { getBotSettings, saveBotSettings } from "@database/repositories/botSettingsRepository";

jest.mock("@database/models/botSettings.schema", () => ({
	BotSettingsConfig: { findOne: jest.fn(), findOneAndUpdate: jest.fn() },
}));

const findOne = jest.mocked(BotSettingsConfig.findOne);
const findOneAndUpdate = jest.mocked(BotSettingsConfig.findOneAndUpdate);

function answers(record: unknown): void {
	const exec = { exec: () => Promise.resolve(record) };
	findOne.mockReturnValue({ select: () => ({ lean: () => exec }) } as never);
}

beforeEach(() => {
	jest.clearAllMocks();
	findOneAndUpdate.mockReturnValue({ exec: () => Promise.resolve(null) } as never);
});

describe("botSettingsRepository", () => {
	/** Read on every `/play`, so it must not become a database round trip per song. */
	it("reads the row once and answers from memory after that", async () => {
		await saveBotSettings({ musicSources: "both" }, null);
		answers({ musicSources: "youtube" });

		expect(await getBotSettings()).toEqual({ musicSources: "youtube" });
		expect(await getBotSettings()).toEqual({ musicSources: "youtube" });
		expect(findOne).toHaveBeenCalledTimes(1);
	});

	/** Otherwise the owner's switch would take five minutes to reach `/play`. */
	it("forgets what it read as soon as the owner changes it", async () => {
		answers({ musicSources: "youtube" });
		await getBotSettings();

		await saveBotSettings({ musicSources: "soundcloud" }, "100000000000000001");
		answers({ musicSources: "soundcloud" });

		expect(await getBotSettings()).toEqual({ musicSources: "soundcloud" });
		expect(findOneAndUpdate).toHaveBeenCalledWith(
			{ scope: "GLOBAL" },
			{ $set: { musicSources: "soundcloud", updatedBy: "100000000000000001" } },
			expect.objectContaining({ upsert: true }),
		);
	});
});
