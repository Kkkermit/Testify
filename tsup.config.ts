import { execFile } from "node:child_process";
import { cp } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { defineConfig } from "tsup";

const run = promisify(execFile);

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
		// esbuild leaves `@core/…` specifiers alone when it is not bundling, so the
		// emitted CommonJS would not resolve at runtime. This rewrites them to the
		// relative paths Node can follow, using the same map from tsconfig.json.
		await run("npx", ["tsc-alias", "-p", "tsconfig.json", "--outDir", "dist"]);
		await cp(resolve("assets"), resolve("dist/assets"), { recursive: true });
	},
});
