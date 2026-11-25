import { type IncomingMessage, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { createServer, type Plugin, type ViteDevServer } from "vite";

/** The dashboard on Vite with every `/api` call answered from fixtures: signed in as an owner, with no bot running. */

interface FixtureApi {
	answer(request: Request): Promise<Response | undefined>;
}

const root = fileURLToPath(new URL("..", import.meta.url));
const reported = new Set<string>();

async function requestOf(incoming: IncomingMessage): Promise<Request> {
	const chunks: Buffer[] = [];
	for await (const chunk of incoming) chunks.push(chunk as Buffer);

	const headers = new Headers();
	for (const [name, value] of Object.entries(incoming.headers)) {
		for (const one of Array.isArray(value) ? value : [value]) if (one !== undefined) headers.append(name, one);
	}

	const method = incoming.method ?? "GET";
	const url = new URL(incoming.url ?? "/", `http://${incoming.headers.host ?? "localhost"}`);
	return new Request(url, { method, headers, ...(chunks.length === 0 ? {} : { body: Buffer.concat(chunks) }) });
}

async function send(response: Response, outgoing: ServerResponse): Promise<void> {
	outgoing.statusCode = response.status;
	response.headers.forEach((value, name) => {
		outgoing.setHeader(name, value);
	});
	outgoing.end(Buffer.from(await response.arrayBuffer()));
}

function unanswered(request: Request): Response {
	const route = `${request.method} ${new URL(request.url).pathname}`;
	if (!reported.has(route)) {
		reported.add(route);
		process.stdout.write(`[fixtures] Nothing answers ${route}, so it gets a 404.\n`);
	}
	return Response.json({ error: { code: "not_found", message: "No fixture answers this route." } }, { status: 404 });
}

function fixtureApi(): Plugin {
	return {
		name: "testify-fixture-api",
		configureServer(server: ViteDevServer) {
			server.middlewares.use((incoming, outgoing, next) => {
				if (incoming.url?.startsWith("/api/") !== true) {
					next();
					return;
				}

				void (async () => {
					const request = await requestOf(incoming);
					try {
						// Loaded through Vite, so the dashboard's own aliases resolve and an edited fixture is picked up.
						const api = (await server.ssrLoadModule("/fixtures/api.ts")) as FixtureApi;
						await send((await api.answer(request)) ?? unanswered(request), outgoing);
					} catch (error) {
						server.config.logger.error(`[fixtures] ${request.method} ${request.url} failed: ${String(error)}`);
						await send(Response.json({ error: { code: "fixture_failed" } }, { status: 500 }), outgoing);
					}
				})();
			});
		},
	};
}

const server = await createServer({
	configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
	root,
	plugins: [fixtureApi()],
});
await server.listen();
server.printUrls();

const local = server.resolvedUrls?.local[0] ?? "http://localhost:5174/";
process.stdout.write(
	`\n  Fixture data, signed in as an owner. The usage sections: ${local}owner?tab=usage\n` +
		"  Nothing is saved: a change is answered as if it worked and forgotten.\n\n",
);
