import { execFile } from "node:child_process";
import { cp } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { defineConfig } from "tsup";

const run = promisify(execFile);

export default defineConfig({
	// A declaration file only describes types, so it has nothing to emit.
	entry: ["src/**/*.ts", "!src/**/*.d.ts"],
	outDir: "dist",
	format: ["cjs"],
	// `engines` requires 24.11, so down-levelling to 22 only costs output nobody runs.
	target: "node24",
	platform: "node",
	sourcemap: true,
	clean: true,
	splitting: false,
	// The loader globs real files at runtime, so the emitted tree mirrors src/ file for file.
	bundle: false,
	async onSuccess() {
		// esbuild leaves `@core/…` specifiers alone when it is not bundling, so this rewrites them with tsconfig.json's map.
		await run("npx", ["tsc-alias", "-p", "tsconfig.json", "--outDir", "dist"]);
		await cp(resolve("assets"), resolve("dist/assets"), { recursive: true });
	},
});
