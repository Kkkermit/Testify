import { type SetupChecklist } from "@testify/shared";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { GuildOverviewPage } from "@/features/guild-overview/GuildOverviewPage";
import { expectNoViolations } from "@/test/axe";
import { overview, setupDone } from "@/test/fixtures/server";
import { aGuild } from "@/test/fixtures/session";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderPage() {
	return renderWithProviders(<GuildOverviewPage />, { path: "/guilds/:guildId", route: `/guilds/${aGuild.id}` });
}

describe("the guild overview", () => {
	/** Discord revokes permissions silently, and this is the only place anyone would find out. */
	it("warns when the bot is missing a permission a feature needs", async () => {
		server.use(
			http.get("/api/guilds/:guildId/overview", () =>
				HttpResponse.json({ ...overview, missingPermissions: ["Manage Roles — needed for level rewards"] }),
			),
		);

		renderPage();

		expect(await screen.findByText(/missing permissions/i)).toBeInTheDocument();
		expect(screen.getByText(/manage roles/i)).toBeInTheDocument();
	});

	it("says nothing about permissions when none are missing", async () => {
		renderPage();
		await screen.findByText("Test Server");

		expect(screen.queryByText(/missing permissions/i)).toBeNull();
	});

	/** Each change leads with what happened, which identifies the row better than when. */
	it("leads each change with what happened, not when", async () => {
		server.use(
			http.get("/api/guilds/:guildId/overview", () =>
				HttpResponse.json({
					...overview,
					recentChanges: [
						{
							actorTag: "someone",
							action: "levelling.update",
							summary: "Turned levelling on",
							at: "2026-01-01T10:00:00.000Z",
						},
					],
				}),
			),
		);

		renderPage();

		const row = (await screen.findByText("Turned levelling on")).closest("li");
		expect(row?.firstElementChild).toHaveTextContent("Turned levelling on");
	});

	/** `7/30/2026` and `30/07/2026` are the same stamp to two different admins, and unreadable as each other. */
	it("dates a change unambiguously whatever the browser's locale is", async () => {
		server.use(
			http.get("/api/guilds/:guildId/overview", () =>
				HttpResponse.json({
					...overview,
					recentChanges: [
						{
							actorTag: "someone",
							action: "levelling.update",
							summary: "Turned levelling on",
							at: "2026-01-05T10:00:00.000Z",
						},
					],
				}),
			),
		);

		renderPage();

		expect(await screen.findByText("5 Jan 2026")).toBeInTheDocument();
	});

	/** 404 here means the bot was removed while they were looking at the page — a different screen from a bug. */
	it("says the bot is gone rather than showing a generic failure", async () => {
		server.use(
			http.get("/api/guilds/:guildId/overview", () =>
				HttpResponse.json({ error: { code: "guild_not_found", message: "no" } }, { status: 404 }),
			),
		);

		renderPage();

		expect(await screen.findByText(/testify is not in that server/i)).toBeInTheDocument();
	});

	it("names the permission when the caller cannot manage the guild", async () => {
		server.use(
			http.get("/api/guilds/:guildId/overview", () =>
				HttpResponse.json({ error: { code: "missing_manage_guild", message: "no" } }, { status: 403 }),
			),
		);

		renderPage();

		expect(await screen.findByText(/you cannot manage that server/i)).toBeInTheDocument();
		expect(screen.getByText(/manage server permission/i)).toBeInTheDocument();
	});

	/** A 500 is the one worth retrying, and the only one that should offer a retry button. */
	it("offers a retry on a server error and not on a refusal", async () => {
		server.use(
			http.get("/api/guilds/:guildId/overview", () =>
				HttpResponse.json({ error: { code: "internal", message: "boom" } }, { status: 500 }),
			),
		);

		renderPage();

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
	});
});

describe("the feature grid", () => {
	/** A card that looks clickable and goes nowhere is worse than one that plainly does not. */
	it("leaves a Discord-only feature inert rather than linking it nowhere", async () => {
		server.use(
			http.get("/api/guilds/:guildId/overview", () =>
				HttpResponse.json({
					...overview,
					features: [{ key: "games", label: "Games", enabled: true, detail: "6 available" }],
				}),
			),
		);

		renderPage();

		expect(await screen.findByText("Games")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /games/i })).toBeNull();
	});
});

describe("GuildOverviewPage accessibility", () => {
	it("has no automatically detectable violations", async () => {
		const { container } = renderPage();
		await screen.findByText("Test Server");

		await expectNoViolations(container);
	});
});

describe("the setup checklist", () => {
	const fresh: SetupChecklist = {
		steps: [
			{ step: "levelling", done: false, channelId: null, channelName: null, createsChannel: false, blocker: null },
			{
				step: "welcome",
				done: false,
				channelId: "400000000000000001",
				channelName: "general",
				createsChannel: false,
				blocker: null,
			},
			{
				step: "audit-log",
				done: false,
				channelId: null,
				channelName: "audit-log",
				createsChannel: true,
				blocker: null,
			},
		],
	};

	function serve(checklist: SetupChecklist): void {
		server.use(http.get("/api/guilds/:guildId/setup", () => HttpResponse.json(checklist)));
	}

	beforeEach(() => {
		localStorage.clear();
	});

	/** A button that does not say where it will post is a button nobody presses. */
	it("says exactly what each click will do before it is pressed", async () => {
		serve(fresh);
		renderPage();

		const steps = await screen.findByRole("list", { name: "Get started" });
		expect(within(steps).getByText("Greet each new member in #general with a welcome card.")).toBeInTheDocument();
		expect(within(steps).getByText(/Make a private #audit-log channel/)).toBeInTheDocument();
		expect(within(steps).getByRole("button", { name: "Create and turn on" })).toBeInTheDocument();
		expect(screen.getByText(/0 of 3 done/)).toBeInTheDocument();
	});

	/** A refused write has to say so beside the control, or the click looks as if it never landed. */
	it("says why a step was refused, beside it", async () => {
		const user = userEvent.setup();
		serve(fresh);
		server.use(
			http.post("/api/guilds/:guildId/setup/:step", () =>
				HttpResponse.json(
					{ error: { code: "bad_request", message: "I need the Manage Channels permission." } },
					{ status: 400 },
				),
			),
		);
		renderPage();

		const steps = await screen.findByRole("list", { name: "Get started" });
		await user.click(within(steps).getByRole("button", { name: "Create and turn on" }));

		const row = (await within(steps).findByText("I need the Manage Channels permission.")).closest("li");
		expect(row).toHaveTextContent("Audit log");
	});

	it("sends a step one click cannot do to its screen instead", async () => {
		serve({
			steps: [
				...setupDone.steps.slice(0, 2),
				{
					step: "audit-log",
					done: false,
					channelId: null,
					channelName: "audit-log",
					createsChannel: true,
					blocker: "you_cannot_create",
				},
			],
		});
		renderPage();

		const steps = await screen.findByRole("list", { name: "Get started" });
		expect(within(steps).queryByRole("button", { name: /turn on/i })).not.toBeInTheDocument();
		expect(within(steps).getByRole("link", { name: "Choose a channel" })).toHaveAttribute(
			"href",
			`/guilds/${aGuild.id}/audit-log`,
		);
	});

	it("passes axe", async () => {
		serve(fresh);
		const { container } = renderPage();
		await screen.findByRole("list", { name: "Get started" });

		await expectNoViolations(container);
	});
});
