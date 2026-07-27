/**
 * The house commit format: `type: Capitalized subject`.
 *
 * No scopes, no bodies required, no `!` markers. `add`, `update` and `remove`
 * are extensions beyond Conventional Commits and are part of the style — see
 * CLAUDE.md §14.
 *
 * The wizard (`npm run commit`) helps whoever uses it; this hook is what makes
 * the convention true for everyone else.
 */
export default {
	rules: {
		"type-enum": [
			2,
			"always",
			["feat", "fix", "docs", "style", "refactor", "perf", "test", "chore", "add", "update", "remove"],
		],
		"type-case": [2, "always", "lower-case"],
		"type-empty": [2, "never"],
		"scope-empty": [2, "always"],
		"subject-empty": [2, "never"],
		"subject-case": [2, "always", "sentence-case"],
		"subject-full-stop": [2, "never", "."],
		"header-max-length": [2, "always", 100],
	},
};
