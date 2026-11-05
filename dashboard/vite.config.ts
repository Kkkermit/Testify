import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath, URL } from "node:url";
import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const resolver = createRequire(import.meta.url);

/** Resolved from this file, so it finds the copy the app itself imports whether npm hoisted it or nested it. */
const packageRoot = (name: string): string => dirname(resolver.resolve(`${name}/package.json`));

export default defineConfig(({ command, mode }) => {
	const env = loadEnv(mode, fileURLToPath(new URL("..", import.meta.url)), ["DASHBOARD_"]);
	const port = env.DASHBOARD_PORT ?? "3000";

	return {
		plugins: [react(), tailwind()],
		define: { __DEV_ERRORS__: JSON.stringify(command === "serve") },
		resolve: {
			// discord-html-transcripts hoists React 18, so hoisted packages must resolve this workspace's React 19.
			dedupe: ["react", "react-dom"],
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
				"@repo": fileURLToPath(new URL("..", import.meta.url)),
				"@testify/shared": fileURLToPath(new URL("../shared/src/index.ts", import.meta.url)),
				react: packageRoot("react"),
				"react-dom": packageRoot("react-dom"),
			},
		},
		server: {
			port: 5174,
			// Same-origin in the browser, so session cookies need no CORS.
			proxy: {
				"/api": {
					target: `http://localhost:${port}`,
					/** One line per outage rather than a stack per refused request; Vite registers its own handler just after calling this, so the replacement waits a tick. */
					configure: (proxy) => {
						let reported = false;

						proxy.on("proxyRes", () => {
							reported = false;
						});

						setTimeout(() => {
							proxy.removeAllListeners("error");
							proxy.on("error", (error, request, response) => {
								const code = "code" in error ? error.code : undefined;

								if (code !== "ECONNREFUSED" && code !== "ECONNRESET" && code !== "ECONNABORTED") {
									console.error(`[proxy] ${request.url ?? "?"}:`, error);
									return;
								}

								if (!reported) {
									reported = true;
									console.warn(`[proxy] The bot's API is not answering on port ${port}. Waiting for it.`);
								}

								if ("writeHead" in response && !response.headersSent) {
									response.writeHead(503, { "content-type": "application/json" });
									response.end(JSON.stringify({ error: { code: "api_down", message: "The bot is not running." } }));
								}
							});
						}, 0);
					},
				},
			},
		},
		build: {
			outDir: "dist",
			/**
			 * The first releases with native `light-dark()`; below them the polyfill stops a nested `color-scheme` working.
			 */
			cssTarget: ["chrome123", "safari17.5", "firefox120", "edge123"],
			// A source map hands anybody the source tree in DevTools.
			sourcemap: false,
			rollupOptions: {
				output: {
					manualChunks: (id) => {
						if (/node_modules\/(?:marked|lowlight|highlight\.js|devlop|dequal)\//.test(id)) return "markdown";
						if (id.includes("node_modules")) return "vendor";
						return undefined;
					},
				},
			},
		},
	};
});
