import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/** The walker the convention sweeps share, so a rule added to one cannot read a different set of files. */

const SRC = resolve(__dirname, "..");

export function everySource(dir: string = SRC, found: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) everySource(path, found);
		else if (path.endsWith(".tsx") && !path.includes(".test.")) found.push(path);
	}

	return found;
}

/** Every line matching `pattern`, prefixed with where it is, so a failure names the file rather than a count. */
export function offenders(pattern: RegExp, only?: (line: string) => boolean): string[] {
	const found: string[] = [];

	for (const path of everySource()) {
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
