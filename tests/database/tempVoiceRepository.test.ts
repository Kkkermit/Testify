import { describeWithMongo } from "../helpers/mongo";
import { purgeGuild } from "@database/repositories/settingsRepository";
import {
	countTempChannels,
	findOwnedTempChannel,
	findTempChannel,
	forgetTempChannel,
	getTempVoiceSettings,
	listTempChannels,
	recordTempChannel,
	saveTempVoiceSettings,
} from "@database/repositories/tempVoiceRepository";

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const ALICE = "100000000000000001";

const made = (channelId: string, guildId = GUILD, ownerId = ALICE) => ({ guildId, channelId, ownerId });

describeWithMongo("tempVoiceRepository", () => {
	it("starts a server's settings at the defaults and keeps what is changed", async () => {
		expect(await getTempVoiceSettings(GUILD)).toBeNull();

		await saveTempVoiceSettings(GUILD, { lobbyChannelId: "400000000000000001" }, ALICE);
		expect(await getTempVoiceSettings(GUILD)).toMatchObject({
			enabled: false,
			lobbyChannelId: "400000000000000001",
			categoryId: null,
			nameTemplate: "{user}'s channel",
			userLimit: 0,
		});
	});

	it("finds a made channel, and the one somebody already has", async () => {
		await recordTempChannel(made("400000000000000010"));
		await recordTempChannel(made("400000000000000011", OTHER));

		expect(await findTempChannel(GUILD, "400000000000000010")).toEqual(made("400000000000000010"));
		expect(await findTempChannel(GUILD, "400000000000000011")).toBeNull();
		expect(await findOwnedTempChannel(GUILD, ALICE)).toEqual(made("400000000000000010"));
		expect(await countTempChannels(GUILD)).toBe(1);
	});

	/** One record per channel, so a channel can never be deleted twice over by two records. */
	it("refuses a second record for the same channel", async () => {
		await recordTempChannel(made("400000000000000010"));

		await expect(recordTempChannel(made("400000000000000010"))).rejects.toThrow();
	});

	it("forgets a channel, lists them for the sweep, and clears up when the bot leaves", async () => {
		await recordTempChannel(made("400000000000000010"));
		await recordTempChannel(made("400000000000000012"));

		expect(await forgetTempChannel(GUILD, "400000000000000010")).toBe(true);
		expect(await forgetTempChannel(GUILD, "400000000000000010")).toBe(false);
		expect((await listTempChannels(10)).map((entry) => entry.channelId)).toEqual(["400000000000000012"]);

		await saveTempVoiceSettings(GUILD, { enabled: true }, null);
		await purgeGuild(GUILD);
		expect(await countTempChannels(GUILD)).toBe(0);
		expect(await getTempVoiceSettings(GUILD)).toBeNull();
	});
});
