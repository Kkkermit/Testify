import { resetContentFilter } from "../src/core/contentFilter";
import { clearCooldowns } from "../src/core/middleware";
import { clearBlacklistCache } from "../src/database/repositories/blacklistRepository";
import { clearGuildSettingsCache } from "../src/database/repositories/guildSettingsRepository";
import { resetEnvCache } from "../src/config/env";

// One place resets shared module state, so no suite inherits another's cache.
beforeEach(() => {
	clearCooldowns();
	clearBlacklistCache();
	clearGuildSettingsCache();
	resetContentFilter();
	resetEnvCache();
});

jest.setTimeout(20_000);
