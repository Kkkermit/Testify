import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { App } from "@/App";
import { server } from "@/test/setup";

describe("the dashboard shell", () => {
	it("reports what the bot says about itself", async () => {
		render(<App />);

		expect(await screen.findByText("ready")).toBeInTheDocument();
		expect(screen.getByText("connected")).toBeInTheDocument();
		expect(screen.getByText("65s")).toBeInTheDocument();
	});

	/** "ok: false" is the state a self-hoster most needs named, so it cannot look the same as healthy. */
	it("names a half-up bot rather than reporting it as fine", async () => {
		server.use(
			http.get("/api/health", () =>
				HttpResponse.json({ ok: false, uptimeMs: 1_000, discord: "connecting", database: "disconnected" }),
			),
		);

		render(<App />);

		expect(await screen.findByText("connecting")).toBeInTheDocument();
		expect(screen.getByText("disconnected")).toBeInTheDocument();
	});

	/** A dashboard opened while the bot is down must say so rather than spin forever. */
	it("says the API is unreachable rather than hanging on the spinner", async () => {
		server.use(http.get("/api/health", () => HttpResponse.error()));

		render(<App />);

		expect(await screen.findByText(/the api is not up/i)).toBeInTheDocument();
	});

	/** The proxy returning HTML is what a misconfigured reverse proxy looks like. */
	it("survives an error response that is not JSON", async () => {
		server.use(http.get("/api/health", () => new HttpResponse("<html>nope</html>", { status: 502 })));

		render(<App />);

		expect(await screen.findByText(/status 502/i)).toBeInTheDocument();
	});
});
