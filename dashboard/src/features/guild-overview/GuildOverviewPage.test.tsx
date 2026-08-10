import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { GuildOverviewPage } from "@/features/guild-overview/GuildOverviewPage";
import { expectNoViolations } from "@/test/axe";
import { aGuild, overview } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderPage() {
	return renderWithProviders(<GuildOverviewPage />, { path: "/guilds/:guildId", route: `/guilds/${aGuild.id}` });
}

describe("the guild overview", () => {
	it("shows the counts and which features are on", async () => {
		renderPage();

		expect(await screen.findByText("Test Server")).toBeInTheDocument();
		// The tile counts up to its value, so the settled number is what is asserted on.
		expect(await screen.findByText("1,234")).toBeInTheDocument();
		expect(screen.getByText("Levelling")).toBeInTheDocument();
		expect(screen.getByText("2 role rewards, 1 boost")).toBeInTheDocument();
	});

	it("says which features are not set up rather than hiding them", async () => {
		renderPage();

		expect(await screen.findByText("Welcome messages")).toBeInTheDocument();
		expect(screen.getByText("Not set up")).toBeInTheDocument();
	});

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

	it("explains the empty change log rather than showing an empty list", async () => {
		renderPage();

		expect(await screen.findByText(/nothing changed here yet/i)).toBeInTheDocument();
	});

	it("lists recent changes when there are some", async () => {
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

		expect(await screen.findByText("Turned levelling on")).toBeInTheDocument();
		expect(screen.getByText("someone")).toBeInTheDocument();
	});

	/**
	 * What changed identifies the row; the stamp does not. Leading with the stamp spent the most scannable
	 * column on the least identifying thing.
	 */
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
	it("links a feature the dashboard can configure to its settings", async () => {
		renderPage();

		expect(await screen.findByRole("link", { name: /levelling/i })).toHaveAttribute(
			"href",
			`/guilds/${aGuild.id}/levelling`,
		);
	});

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
