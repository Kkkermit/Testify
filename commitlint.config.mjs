/** The house commit format, `type: Capitalized subject`, as AGENTS.md §19 describes it. */
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
