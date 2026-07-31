import { fileURLToPath, URL } from "node:url";
import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// The API port is the bot's, so the proxy has to read the same variable the bot does rather than
// hardcoding 8080 — otherwise changing DASHBOARD_PORT breaks development only.
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, fileURLToPath(new URL("..", import.meta.url)), "DASHBOARD_");
	const port = env.DASHBOARD_PORT ?? "8080";

	return {
		plugins: [react(), tailwind()],
		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
				"@testify/shared": fileURLToPath(new URL("../shared/src/index.ts", import.meta.url)),
			},
		},
		server: {
			port: 5173,
			// Same-origin in the browser, so session cookies work with no CORS at all.
			proxy: { "/api": `http://localhost:${port}` },
		},
		build: {
			outDir: "dist",
			sourcemap: true,
		},
	};
});
