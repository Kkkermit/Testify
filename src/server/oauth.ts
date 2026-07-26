import express, { type Express, type Request, type Response } from "express";
import { type Server } from "node:http";
import { type TestifyClient } from "../core/client";
import { toError } from "../core/errors";
import { saveSpotifyTokens } from "../database/repositories/integrationRepository";
import { exchangeCode } from "../integrations/spotify";
import { spotifyCredentials, verifyState } from "../features/integrations/services/spotifySession";

/**
 * Exported, never self-starting. Requiring the previous `server.js` booted an
 * Express listener and an ngrok tunnel as an import side effect, which made it
 * impossible to test or mock.
 */
export function createOAuthApp(client: TestifyClient): Express {
	const app = express();
	app.disable("x-powered-by");

	app.get("/health", (_request: Request, response: Response) => {
		response.json({ status: "ok", uptimeMs: Date.now() - client.startedAt });
	});

	app.get("/callback", (request: Request, response: Response) => {
		void (async () => {
			const code = typeof request.query.code === "string" ? request.query.code : null;
			const state = typeof request.query.state === "string" ? request.query.state : null;

			if (code === null || state === null) {
				response.status(400).send(page("Missing parameters", "The callback did not include a code and state."));
				return;
			}

			try {
				const discordId = verifyState(client, state);
				const tokens = await exchangeCode(spotifyCredentials(client), code);
				await saveSpotifyTokens(discordId, tokens, client.env.TOKEN_ENCRYPTION_KEY);

				client.logger.info({ discordId }, "Linked a Spotify account");
				response.send(page("Linked", "Your Spotify account is connected. You can close this tab."));
			} catch (error) {
				client.logger.warn({ err: toError(error) }, "Spotify callback failed");
				response.status(400).send(page("Could not link", toError(error).message));
			}
		})();
	});

	return app;
}

export function startOAuthServer(client: TestifyClient): Server {
	const server = createOAuthApp(client).listen(client.env.OAUTH_PORT, () => {
		client.logger.info({ port: client.env.OAUTH_PORT }, "OAuth callback server listening");
	});

	return server;
}

function page(title: string, message: string): string {
	const escape = (value: string): string =>
		value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);

	return `<!doctype html><meta charset="utf-8"><title>${escape(title)}</title><body style="font-family:system-ui;background:#1e1f22;color:#f2f3f5;display:grid;place-items:center;height:100vh;margin:0"><main style="text-align:center"><h1>${escape(title)}</h1><p>${escape(message)}</p></main>`;
}
