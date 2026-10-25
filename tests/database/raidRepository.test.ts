import { describeWithMongo } from "../helpers/mongo";
import { RaidSettingsConfig } from "@database/models/raid.schema";
import { getRaidSettings, purgeRaidSettings, saveRaidSettings } from "@database/repositories/raidRepository";
import { DEFAULT_RAID } from "@testify/shared";

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const ADMIN = "100000000000000001";

describeWithMongo("raidRepository", () => {
	it("starts a server with the defaults and keeps each server's own", async () => {
		expect(await getRaidSettings(GUILD)).toBeNull();

		const saved = await saveRaidSettings(GUILD, { minAccountAgeDays: 7 }, ADMIN);

		expect(saved).toEqual(expect.objectContaining({ ...DEFAULT_RAID, minAccountAgeDays: 7 }));
		expect(await getRaidSettings(OTHER)).toBeNull();
	});

	/** Read on every join from a cache, so a save that left it stale would hold people back by yesterday's rule. */
	it("is read afresh after every save", async () => {
		await saveRaidSettings(GUILD, { enabled: true, minAccountAgeDays: 7 }, ADMIN);
		expect((await getRaidSettings(GUILD))?.minAccountAgeDays).toBe(7);

		await saveRaidSettings(GUILD, { minAccountAgeDays: 3 }, ADMIN);

		expect((await getRaidSettings(GUILD))?.minAccountAgeDays).toBe(3);
	});

	it("refuses a minimum age past Discord's longest timeout", async () => {
		await expect(saveRaidSettings(GUILD, { minAccountAgeDays: 29 }, ADMIN)).rejects.toThrow();
	});

	it("forgets a server's settings, and its cached copy, when the bot leaves", async () => {
		await saveRaidSettings(GUILD, { enabled: true }, ADMIN);
		await saveRaidSettings(OTHER, { enabled: true }, ADMIN);
		await getRaidSettings(GUILD);

		await purgeRaidSettings(GUILD);

		expect(await getRaidSettings(GUILD)).toBeNull();
		expect(await RaidSettingsConfig.countDocuments({ guildId: OTHER })).toBe(1);
	});
});
