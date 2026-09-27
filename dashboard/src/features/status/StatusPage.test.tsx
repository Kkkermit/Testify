import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { StatusPage } from "@/features/status/StatusPage";
import { expectNoViolations } from "@/test/axe";
import { botStatus } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderPage() {
	return renderWithProviders(<StatusPage />, { path: "/status", route: "/status" });
}

function answer(body: unknown, status = 200): void {
	server.use(http.get("/api/status", () => HttpResponse.json(body as never, { status })));
}

describe("StatusPage", () => {
	it("leads with one sentence on how the bot is doing", async () => {
		renderPage();

		expect(await screen.findByRole("heading", { level: 2, name: "Everything is working" })).toBeInTheDocument();
		expect(screen.getByText(/^Online for 2d 3h/)).toBeInTheDocument();
	});

	it("shows how quickly Discord, the database and commands are answering", async () => {
		renderPage();

		expect(await screen.findByText("42 ms")).toBeInTheDocument();
		expect(screen.getByText("6 ms")).toBeInTheDocument();
		expect(screen.getByText("1,240 ms")).toBeInTheDocument();
	});

	it("lists every check with its own verdict", async () => {
		renderPage();

		const checks = (await screen.findByRole("heading", { name: "Health checks" })).parentElement!;
		expect(within(checks).getAllByRole("listitem")).toHaveLength(5);
		expect(within(checks).getByText("Responsiveness")).toBeInTheDocument();
		expect(within(checks).getByText(/14 runs in the last hour/)).toBeInTheDocument();
	});

	it("names each outside service and how its calls went", async () => {
		renderPage();

		expect(await screen.findByText("Reddit")).toBeInTheDocument();
		expect(screen.getByText(/1 of 4 calls failed/)).toBeInTheDocument();
		expect(screen.getByText("Degraded")).toBeInTheDocument();
	});

	it("reports the music binaries, including their age", async () => {
		renderPage();

		expect(await screen.findByText("Version 2026.09.01, 22 days old")).toBeInTheDocument();
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

	it("says so when something is down", async () => {
		answer({ ...botStatus, level: "down", database: { level: "down", pingMs: null } });
		renderPage();

		expect(await screen.findByRole("heading", { name: "Something is down" })).toBeInTheDocument();
		expect(screen.getByText("Did not answer a ping")).toBeInTheDocument();
	});

	it("warns when the owner has paused the bot", async () => {
		answer({ ...botStatus, level: "degraded", paused: true });
		renderPage();

		expect(await screen.findByText(/Paused from the owner console/)).toBeInTheDocument();
	});

	/** The dashboard lives inside the bot, so a status request that fails is itself the outage. */
	it("says the bot is not answering when the status cannot be read", async () => {
		answer({ error: { code: "internal", message: "boom" } }, 502);
		renderPage();

		expect(await screen.findByRole("heading", { name: "Testify is not answering" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
	});

	it("explains an empty list of services rather than showing nothing", async () => {
		answer({ ...botStatus, services: [] });
		renderPage();

		expect(await screen.findByText("Nothing has been called since the bot started.")).toBeInTheDocument();
	});

	it("has no detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { name: "Everything is working" });

		await expectNoViolations(container);
	});
});
