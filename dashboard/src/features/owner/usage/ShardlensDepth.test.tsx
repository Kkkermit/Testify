import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { expectNoViolations } from "@/test/axe";
import { aGuild } from "@/test/fixtures/session";
import { collectorSetup } from "@/test/fixtures/usageSections";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderAt(route: string) {
	return renderWithProviders(<OwnerPage />, { path: "/owner", route });
}

/** Every request the page made for a command in depth, by the path it asked. */
function watchCommands(): string[] {
	const asked: string[] = [];
	server.events.on("request:start", ({ request }) => {
		const path = new URL(request.url).pathname;
		if (path.startsWith("/api/analytics/commands/")) asked.push(path);
	});
	return asked;
}

afterEach(() => {
	server.events.removeAllListeners();
});

describe("a command in depth", () => {
	it("opens from the commands lists, keeps the window, and goes back to them", async () => {
		const asked = watchCommands();
		const user = userEvent.setup();
		const view = renderAt("/owner?tab=usage&days=7");

		await user.click(await screen.findByRole("link", { name: "/ban" }));

		expect(await screen.findByRole("heading", { name: "/warn" })).toBeInTheDocument();
		expect(asked.at(-1)).toBe("/api/analytics/commands/ban");
		expect(view.search()).toContain("command=ban");
		expect(view.search()).toContain("days=7");

		await user.click(screen.getByRole("link", { name: "All commands" }));
		expect(await screen.findByRole("heading", { name: "Most used" })).toBeInTheDocument();
		expect(view.search()).not.toContain("command=");
	});

	/** The address is typed into, so a name that could not be a command is never asked about. */
	it("asks nothing for a name that is not a command", async () => {
		const asked = watchCommands();
		renderAt("/owner?tab=usage&command=..%2Fsecret");

		expect(await screen.findByRole("heading", { name: "Most used" })).toBeInTheDocument();
		expect(asked).toEqual([]);
	});

	it("reads its answer times, choices, forms and handlers, with the figures as tables", async () => {
		const { container } = renderAt("/owner?tab=usage&command=warn");

		const latency = await screen.findByRole("table", { name: "How long Discord waited" });
		expect(within(latency).getAllByRole("row")).toHaveLength(41);
		expect(screen.getByText("1h")).toBeInTheDocument();
		expect(screen.getByText("warnform:submit")).toBeInTheDocument();
		expect(screen.getByText("Testify HQ")).toBeInTheDocument();
		expect(screen.getByText("Answered privately")).toBeInTheDocument();
		await expectNoViolations(container);
	});
});

describe("the collector's setup", () => {
	/** Who ran what needs three things in two places, so each missing one says exactly what to change and where. */
	it("names each missing step for who ran what with what to change, and is read aloud as done or missing", async () => {
		const { container } = renderAt("/owner?tab=usage&view=setup");

		const checks = await screen.findByRole("list", { name: "Setup" });
		const audit = within(checks).getByText("The collector records who ran what").closest("li")!;
		expect(audit).toHaveTextContent(/missing/);
		expect(audit).toHaveTextContent(/SHARDLENS_MODE=audit/);
		const key = within(checks).getByText("The bot can read who ran what").closest("li")!;
		expect(key).toHaveTextContent(/done/);
		expect(key).not.toHaveTextContent(/SHARDLENS_ACTIVITY_KEY/);
		expect(screen.getByText(/3 waiting, 0 dropped, 1 failed send/)).toBeInTheDocument();
		expect(screen.getByText("Node.js 24.11.0 · discord.js 14.24.2 · SDK 1.1.0")).toBeInTheDocument();
		await expectNoViolations(container);
	});

	it("says the bot has not reported rather than leaving the panel blank", async () => {
		server.use(
			http.get("/api/analytics/setup", () => HttpResponse.json({ ...collectorSetup, bot: null, instances: [] })),
		);
		renderAt("/owner?tab=usage&view=setup");

		expect(await screen.findByText("The bot has not reported yet.")).toBeInTheDocument();
		expect(screen.getByText("No process has reported yet.")).toBeInTheDocument();
	});
});

describe("the fuller sections", () => {
	it("shows calls to Discord, its limits and the minutes that rushed", async () => {
		renderAt("/owner?tab=usage&view=reliability");

		expect(await screen.findByText("POST /channels/:id/messages")).toBeInTheDocument();
		expect(screen.getByText(/12 of 10,000/)).toBeInTheDocument();
		expect(screen.getByText("998 of 1,000")).toBeInTheDocument();
		expect(screen.getByText("Usually 4 a minute")).toBeInTheDocument();
		expect(screen.getByRole("table", { name: "Memory" })).toBeInTheDocument();
	});

	it("shows Discord's own count, the servers that keep going and installs from Discord", async () => {
		renderAt("/owner?tab=usage&view=servers");

		const cohorts = await screen.findByRole("table", { name: "Servers that keep using it" });
		expect(within(cohorts).getByText("Week 2")).toBeInTheDocument();
		expect(screen.getByText(/Webhook events are off/)).toBeInTheDocument();
		expect(screen.getByText("applications.commands")).toBeInTheDocument();
		expect(screen.getByText(/1 added and 0 removed while the bot was offline/)).toBeInTheDocument();
	});

	it("shows people each week and period, and how the bot was installed", async () => {
		renderAt("/owner?tab=usage&view=people");

		expect(await screen.findByRole("table", { name: "People each week" })).toBeInTheDocument();
		expect(screen.getByText("Still counting")).toBeInTheDocument();
		expect(screen.getByText("To a server")).toBeInTheDocument();
	});

	it("lists every event the bot counts under its own name", async () => {
		renderAt("/owner?tab=usage&view=activity");

		expect(await screen.findByText("dashboard_screen")).toBeInTheDocument();
	});

	/** The collector stores the bits; the page names each permission the way Discord's own client does. */
	it("names what the collector knows of one server, its missing permissions by name", async () => {
		renderAt(`/owner?tab=usage&guild=${aGuild.id}`);

		expect(await screen.findByRole("heading", { name: "What the collector knows" })).toBeInTheDocument();
		expect(screen.getByText("Manage Roles")).toBeInTheDocument();
		expect(screen.getByText("Added the bot")).toBeInTheDocument();
	});
});
