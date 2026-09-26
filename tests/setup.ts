/** Shared state is reset between tests so no suite inherits another's cache. */
beforeEach(() => {
	const reset = (module: string, name: string): void => {
		const loaded = jest.requireActual(module);
		const fn = loaded[name];
		// A renamed reset would otherwise stop running without anybody noticing, and suites would share state.
		if (typeof fn !== "function") throw new Error(`${module} no longer exports ${name}; update tests/setup.ts.`);
		(fn as () => void)();
	};

	reset("@config/env", "resetEnv");
	reset("@core/checks", "clearCooldowns");
	reset("@database/repositories/blacklistRepository", "clearBlacklistCache");
	reset("@database/repositories/settingsRepository", "clearPrefixCache");
});

jest.setTimeout(20_000);
