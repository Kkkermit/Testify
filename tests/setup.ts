import { resetEnv } from "../src/config/env";
import { clearCooldowns } from "../src/core/checks";
import { clearBlacklistCache } from "../src/database/repositories/blacklistRepository";

// One place resets shared module state, so no suite inherits another's cache.
beforeEach(() => {
	clearCooldowns();
	clearBlacklistCache();
	resetEnv();
});

jest.setTimeout(20_000);
