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

		const saved = await saveRaidSettings(GUILD, { minAccountAgeMinutes: 10080 }, ADMIN);

		expect(saved).toEqual(expect.objectContaining({ ...DEFAULT_RAID, minAccountAgeMinutes: 10080 }));
		expect(await getRaidSettings(OTHER)).toBeNull();
	});

	/** Read on every join from a cache, so a save that left it stale would hold people back by yesterday's rule. */
	it("is read afresh after every save", async () => {
		await saveRaidSettings(GUILD, { enabled: true, minAccountAgeMinutes: 10080 }, ADMIN);
		expect((await getRaidSettings(GUILD))?.minAccountAgeMinutes).toBe(10080);

		await saveRaidSettings(GUILD, { minAccountAgeMinutes: 4320 }, ADMIN);

		expect((await getRaidSettings(GUILD))?.minAccountAgeMinutes).toBe(4320);
	});

	/** A record written while the age was kept in days is read as it stands, and its days go once minutes are saved. */
	it("hands back a record kept in days, and retires the days when minutes are written", async () => {
		await RaidSettingsConfig.collection.insertOne({ guildId: GUILD, enabled: true, minAccountAgeDays: 3 });

		const before = await getRaidSettings(GUILD);
		await saveRaidSettings(GUILD, { minAccountAgeMinutes: 4320 }, ADMIN);
		const raw = await RaidSettingsConfig.collection.findOne({ guildId: GUILD });

		expect(before).toEqual(expect.objectContaining({ minAccountAgeDays: 3 }));
		expect(before?.minAccountAgeMinutes).toBeUndefined();
		expect(raw).toEqual(expect.objectContaining({ minAccountAgeMinutes: 4320 }));
		expect(raw).not.toHaveProperty("minAccountAgeDays");
	});

	it("refuses a minimum age past Discord's longest timeout", async () => {
		await expect(saveRaidSettings(GUILD, { minAccountAgeMinutes: 41760 }, ADMIN)).rejects.toThrow();
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
