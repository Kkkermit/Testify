import { resetEnv } from "@config/env";
import { clearCooldowns } from "@core/checks";
import { clearBlacklistCache } from "@database/repositories/blacklistRepository";

// One place resets shared module state, so no suite inherits another's cache.
beforeEach(() => {
	clearCooldowns();
	clearBlacklistCache();
	resetEnv();
});

jest.setTimeout(20_000);
