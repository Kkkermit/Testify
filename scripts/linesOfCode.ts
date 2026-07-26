import { readFileSync, statSync } from "node:fs";
import { globSync } from "glob";
import { resolve } from "node:path";

interface Summary {
	files: number;
	lines: number;
	bytes: number;
}

const GROUPS: { name: string; pattern: string }[] = [
	{ name: "core", pattern: "src/core/**/*.ts" },
	{ name: "config", pattern: "src/config/**/*.ts" },
	{ name: "database", pattern: "src/database/**/*.ts" },
	{ name: "features", pattern: "src/features/**/*.ts" },
	{ name: "adapters", pattern: "src/adapters/**/*.ts" },
	{ name: "integrations", pattern: "src/integrations/**/*.ts" },
	{ name: "ui", pattern: "src/ui/**/*.ts" },
	{ name: "jobs", pattern: "src/jobs/**/*.ts" },
	{ name: "server", pattern: "src/server/**/*.ts" },
	{ name: "events", pattern: "src/events/**/*.ts" },
	{ name: "tests", pattern: "tests/**/*.ts" },
	{ name: "scripts", pattern: "scripts/**/*.ts" },
];

function measure(pattern: string): Summary {
	const files = globSync(pattern, { cwd: resolve(process.cwd()), absolute: true, nodir: true });

	return files.reduce<Summary>(
		(summary, file) => ({
			files: summary.files + 1,
			lines: summary.lines + readFileSync(file, "utf8").split("\n").length,
			bytes: summary.bytes + statSync(file).size,
		}),
		{ files: 0, lines: 0, bytes: 0 },
	);
}

const rows = GROUPS.map((group) => ({ group: group.name, ...measure(group.pattern) }));
const total = rows.reduce<Summary>(
	(sum, row) => ({ files: sum.files + row.files, lines: sum.lines + row.lines, bytes: sum.bytes + row.bytes }),
	{ files: 0, lines: 0, bytes: 0 },
);

console.table([...rows, { group: "TOTAL", ...total }]);
