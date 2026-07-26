import { cp } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/**/*.ts"],
	outDir: "dist",
	format: ["cjs"],
	target: "node22",
	platform: "node",
	sourcemap: true,
	clean: true,
	splitting: false,
	// The module loader globs real files at runtime, so the emitted tree has to
	// mirror src/ file-for-file. Bundling would collapse it and break discovery.
	bundle: false,
	async onSuccess() {
		await cp(resolve("assets"), resolve("dist/assets"), { recursive: true });
	},
});
