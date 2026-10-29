/** Module-level caches the harness empties between tests, so no test inherits another's state. */
const RESETS: readonly (readonly [module: string, name: string])[] = [
	["@config/env", "resetEnv"],
	["@core/checks", "clearCooldowns"],
	["@database/repositories/afkRepository", "clearAfkCache"],
	["@database/repositories/autoResponderRepository", "clearAutoResponderCache"],
	["@database/repositories/blacklistRepository", "clearBlacklistCache"],
	["@database/repositories/prefixRepository", "clearPrefixCache"],
	["@database/repositories/raidRepository", "clearRaidCache"],
];

beforeEach(() => {
	for (const [module, name] of RESETS) {
		// Only a module this suite loaded can hold state; loading the rest just to empty them cost most of a second.
		const loaded = require.cache[require.resolve(module)]?.exports as Record<string, unknown> | undefined;
		if (loaded === undefined) continue;

		// A renamed reset would otherwise stop running without anybody noticing, and tests would share state.
		const reset = loaded[name];
		if (typeof reset !== "function") throw new Error(`${module} no longer exports ${name}; update tests/setup.ts.`);
		(reset as () => void)();
	}
});

jest.setTimeout(20_000);
