/** Shared state is reset between tests so no suite inherits another's cache. */
beforeEach(() => {
	const reset = (module: string, name: string): void => {
		const loaded = jest.requireActual(module);
		const fn = loaded[name];
		if (typeof fn === "function") (fn as () => void)();
	};

	reset("@config/env", "resetEnv");
	reset("@core/checks", "clearCooldowns");
	reset("@database/repositories/blacklistRepository", "clearBlacklistCache");
	reset("@database/repositories/settingsRepository", "clearPrefixCache");
});

jest.setTimeout(20_000);
