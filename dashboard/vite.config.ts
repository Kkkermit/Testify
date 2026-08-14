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
			// React 19 nested. Without this, react-query and react-router resolve the hoisted 18 while the app
			// renders with 19, and every hook in them reads a null dispatcher.
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
			proxy: {
				"/api": {
					target: `http://localhost:${port}`,
					/** `tsx watch` restarts the bot on every save, so Vite's handler would print a stack per refused request; this is one line per outage instead. Vite registers its own handler immediately after calling this, so the replacement waits a tick. */
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
			 * The floor is the first release of each browser that shipped `light-dark()` natively — Chrome 123,
			 * Safari 17.5, Firefox 120, all 2024.
			 *
			 * Below it Lightning CSS polyfills the function into a pair of variables flipped by `color-scheme`,
			 * and because a custom property is substituted where it is *declared*, every token resolves against
			 * `:root` and no nested `color-scheme` can change it. The theme samples on the appearance page each
			 * rendered in the page's own theme, which is the bug that named this line.
			 */
			cssTarget: ["chrome123", "safari17.5", "firefox120", "edge123"],
			// three is over the default and is already split and loaded on demand.
			chunkSizeWarningLimit: 600,
			// Open source: a stack trace someone can read is worth the file size.
			sourcemap: true,
			rollupOptions: {
				output: {
					manualChunks: (id) => {
						// three is half a megabyte and only the backdrop imports it, dynamically. Left in `vendor` it
						// would be pulled into the initial load anyway, which is the opposite of the point.
						if (id.includes("node_modules/three")) return "three";
						// A vendor chunk of its own, so an app change does not invalidate the whole cache.
						if (id.includes("node_modules")) return "vendor";
						return undefined;
					},
				},
			},
		},
	};
});
