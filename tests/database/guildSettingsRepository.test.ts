import { DEFAULT_PREFIX } from "../../src/config/constants";
import {
	clearGuildSettingsCache,
	ensureGuildSettings,
	getGuildSettings,
	guildSettingsCacheSize,
	invalidateGuildSettings,
	setPrefix,
	setPrefixEnabled,
} from "../../src/database/repositories/guildSettingsRepository";
import { describeWithMongo, mongoAvailable } from "../helpers/mongo";

describeWithMongo("guildSettingsRepository", () => {
	beforeEach(() => clearGuildSettingsCache());

	it("falls back to the default prefix for an unknown guild", async () => {
		if (!mongoAvailable()) return;

		const settings = await getGuildSettings("unknown");
		expect(settings.prefix).toBe(DEFAULT_PREFIX);
		expect(settings.isPrefixEnabled).toBe(true);
	});

	it("persists and reads back a custom prefix", async () => {
		if (!mongoAvailable()) return;

		await setPrefix("guild-1", "!");
		expect((await getGuildSettings("guild-1")).prefix).toBe("!");
	});

	// The hot path used to fire two uncached queries per message, per guild.
	it("serves repeat reads from the cache", async () => {
		if (!mongoAvailable()) return;

		await setPrefix("guild-1", "?");
		await getGuildSettings("guild-1");
		expect(guildSettingsCacheSize()).toBe(1);

		await getGuildSettings("guild-1");
		expect(guildSettingsCacheSize()).toBe(1);
	});

	it("invalidates the cache on write", async () => {
		if (!mongoAvailable()) return;

		await setPrefix("guild-1", "?");
		await getGuildSettings("guild-1");
		await setPrefix("guild-1", "$");

		expect((await getGuildSettings("guild-1")).prefix).toBe("$");
	});

	it("invalidates one guild without clearing the rest", async () => {
		if (!mongoAvailable()) return;

		await getGuildSettings("guild-1");
		await getGuildSettings("guild-2");
		invalidateGuildSettings("guild-1");

		expect(guildSettingsCacheSize()).toBe(1);
	});

	it("toggles the prefix system", async () => {
		if (!mongoAvailable()) return;

		await setPrefixEnabled("guild-1", false);
		expect((await getGuildSettings("guild-1")).isPrefixEnabled).toBe(false);
	});

	// Seeding on guild join never actually ran before, because the handler
	// declared a signature the event never matches.
	it("seeds defaults when the bot joins a guild", async () => {
		if (!mongoAvailable()) return;

		const seeded = await ensureGuildSettings("fresh-guild");
		expect(seeded.prefix).toBe(DEFAULT_PREFIX);
	});

	it("does not overwrite an existing prefix when seeding", async () => {
		if (!mongoAvailable()) return;

		await setPrefix("guild-1", "%");
		await ensureGuildSettings("guild-1");

		expect((await getGuildSettings("guild-1")).prefix).toBe("%");
	});
});
