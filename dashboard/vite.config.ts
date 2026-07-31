import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath, URL } from "node:url";
import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const resolver = createRequire(import.meta.url);

/** Resolved from this file, so it finds the copy the app itself imports whether npm hoisted it or nested it. */
const packageRoot = (name: string): string => dirname(resolver.resolve(`${name}/package.json`));

// The API port is the bot's, so the proxy has to read the same variable the bot does rather than
// hardcoding it — otherwise changing DASHBOARD_PORT breaks development only.
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, fileURLToPath(new URL("..", import.meta.url)), "DASHBOARD_");
	const port = env.DASHBOARD_PORT ?? "3000";

	return {
		plugins: [react(), tailwind()],
		resolve: {
			// discord-html-transcripts pins React 18, which npm hoists to the root and leaves this workspace's
			// React 19 nested — so react-query and react-router, hoisted alongside it, bound to 18 while the app
			// rendered with 19. Two Reacts in one page means every hook reads a null dispatcher.
			dedupe: ["react", "react-dom"],
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
				"@testify/shared": fileURLToPath(new URL("../shared/src/index.ts", import.meta.url)),
				react: packageRoot("react"),
				"react-dom": packageRoot("react-dom"),
			},
		},
		server: {
			port: 5174,
			// Same-origin in the browser, so session cookies work with no CORS at all.
			proxy: { "/api": `http://localhost:${port}` },
		},
		build: {
			outDir: "dist",
			// Open source: a stack trace someone can read is worth the file size.
			sourcemap: true,
			rollupOptions: {
				// A vendor chunk of its own, so an app change does not invalidate the whole cache.
				output: {
					manualChunks: (id) => (id.includes("node_modules") ? "vendor" : undefined),
				},
			},
		},
	};
});
