import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface LockedPackage {
	version?: string;
	os?: string[];
	libc?: string[];
	hasInstallScript?: boolean;
}

const read = <T>(file: string): T => JSON.parse(readFileSync(resolve(__dirname, "../..", file), "utf8")) as T;

const locked = Object.entries(read<{ packages: Record<string, LockedPackage> }>("package-lock.json").packages)
	.filter(([path]) => path.includes("node_modules/"))
	.map(([path, entry]) => ({ name: path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length), ...entry }));

describe("the lockfile", () => {
	/** npm warns about, and says it will one day block, an install script `allowScripts` does not name. */
	it("names every package that runs an install script in allowScripts", () => {
		const allowed = Object.keys(read<{ allowScripts?: Record<string, boolean> }>("package.json").allowScripts ?? {});
		const running = [...new Set(locked.filter((entry) => entry.hasInstallScript === true).map((entry) => entry.name))];

		expect(running.filter((name) => !allowed.includes(name))).toEqual([]);
		expect(allowed.filter((name) => !running.includes(name))).toEqual([]);
	});

	/** npm writes `libc` from each binary's own manifest, so a Linux build for one C library with none is a hand edit gone short. */
	it("says which C library each Linux binary built for one is for", () => {
		const wrong = locked
			.filter((entry) => entry.os?.includes("linux") === true && /-(?:gnu|glibc|musl)$/.test(entry.name))
			.filter((entry) => {
				const expected = entry.name.endsWith("-musl") ? "musl" : "glibc";
				return entry.libc?.length !== 1 || entry.libc[0] !== expected;
			})
			.map((entry) => `${entry.name}@${entry.version ?? "?"}`);

		expect(wrong).toEqual([]);
	});
});
