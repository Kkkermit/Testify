/**
 * Shared state is reset between tests so no suite inherits another's cache.
 *
 * The modules are required inside the hook rather than imported at the top: a
 * top-level import loads the real module before any test file's `jest.mock` is
 * registered, which pins the real one in the registry and silently defeats the
 * mock.
 */
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
