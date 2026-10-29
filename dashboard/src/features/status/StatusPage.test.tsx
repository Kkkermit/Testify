import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { StatusPage } from "@/features/status/StatusPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderPage() {
	return renderWithProviders(<StatusPage />, { path: "/status", route: "/status" });
}

function answer(body: unknown, status = 200): void {
	server.use(http.get("/api/status", () => HttpResponse.json(body as never, { status })));
}

describe("StatusPage", () => {
	it("shows how quickly Discord, the database and commands are answering", async () => {
		renderPage();

		expect(await screen.findByText("42 ms")).toBeInTheDocument();
		expect(screen.getByText("6 ms")).toBeInTheDocument();
		expect(screen.getByText("1,240 ms")).toBeInTheDocument();
	});

	/** yt-dlp's age only matters to whoever hosts the bot, and marked the whole page degraded for everyone else. */
	it("does not list the music binaries", async () => {
		renderPage();

		await screen.findByRole("heading", { name: "Health checks" });
		expect(screen.queryByRole("heading", { name: "Packages" })).not.toBeInTheDocument();
		expect(screen.queryByText("yt-dlp")).not.toBeInTheDocument();
		expect(screen.queryByText("FFmpeg")).not.toBeInTheDocument();
	});

	/** A day before the first heartbeat is not an outage, so the average must not count it. */
	it("averages uptime over the days it has heartbeats for", async () => {
		renderPage();

		expect(await screen.findByText("96.66% up")).toBeInTheDocument();
	});

	it("gives a screen reader the history as tables", async () => {
		renderPage();

		expect(await screen.findByRole("table", { name: "Uptime per day" })).toBeInTheDocument();
		expect(screen.getByRole("table", { name: "State per half hour" })).toBeInTheDocument();
	});

	/** The dashboard lives inside the bot, so a status request that fails is itself the outage. */
	it("says the bot is not answering when the status cannot be read", async () => {
		answer({ error: { code: "internal", message: "boom" } }, 502);
		renderPage();

		expect(await screen.findByRole("heading", { name: "Testify is not answering" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
	});

	it("has no detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { name: "Everything is working" });

		await expectNoViolations(container);
	});
});
