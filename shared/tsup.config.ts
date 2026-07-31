import { defineConfig } from "tsup";

/**
 * The bot emits unbundled CommonJS and the dashboard is an ESM browser build, so this ships both rather than
 * asking each consumer to compile the same TypeScript twice.
 *
 * Only the bot's `dist/` reads this output. TypeScript, Jest and Vite all resolve `@testify/shared` to the
 * source, so an edit here is visible to a typecheck and a test without a build.
 */
export default defineConfig({
	entry: ["src/index.ts"],
	outDir: "dist",
	format: ["cjs", "esm"],
	target: "node22",
	// No declarations: `types` points at src/index.ts, so every type consumer already reads the source. Emitting
	// them added four seconds to `prepare`, and so to every npm install, for two files nothing opens.
	dts: false,
	sourcemap: true,
	clean: true,
});
