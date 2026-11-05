import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const SRC = resolve(__dirname, "..");

function walk(dir: string, keep: (path: string) => boolean, found: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) walk(path, keep, found);
		else if (keep(path)) found.push(path);
	}

	return found;
}

export function everySource(): string[] {
	return walk(SRC, (path) => path.endsWith(".tsx") && !path.includes(".test."));
}

export function everyModule(): string[] {
	return walk(SRC, (path) => /\.tsx?$/.test(path) && !path.includes(".test.") && !path.endsWith(".d.ts"));
}

export function offenders(pattern: RegExp, only?: (line: string) => boolean, files = everySource()): string[] {
	const found: string[] = [];

	for (const path of files) {
		readFileSync(path, "utf8")
			.split("\n")
			.forEach((line, index) => {
				if (!pattern.test(line)) return;
				if (only !== undefined && !only(line)) return;
				found.push(`${path.slice(SRC.length + 1)}:${String(index + 1)} ${line.trim().slice(0, 76)}`);
			});
	}

	return found;
}
