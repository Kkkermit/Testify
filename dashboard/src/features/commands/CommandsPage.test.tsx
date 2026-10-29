import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { configurableAt, filterCommands, groupByCategory } from "@/features/commands/commands.utils";
import { CommandsPage } from "@/features/commands/CommandsPage";
import { expectNoViolations } from "@/test/axe";
import { catalogue } from "@/test/fixtures/bot";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(inGuild = true) {
	return inGuild
		? renderWithProviders(<CommandsPage />, {
				path: "/guilds/:guildId/commands",
				route: `/guilds/${GUILD}/commands`,
			})
		: renderWithProviders(<CommandsPage />, { path: "/commands", route: "/commands" });
}

const commands = catalogue.commands;

/** A command with no screen, now that the fixture's own `/ban` has one on the member page. */
const discordOnly = { ...commands[0]!, name: "clear", aliases: [] };

describe("filterCommands", () => {
	/** Somebody who knows the prefix form should not have to know the slash name to find it. */
	it("finds a command by its prefix alias", () => {
		expect(filterCommands(commands, { search: "b", category: null }).some((c) => c.name === "ban")).toBe(true);
	});
});

describe("groupByCategory", () => {
	/** An empty category heading with nothing under it reads as a rendering bug. */
	it("drops a category with nothing left in it after filtering", () => {
		const onlyBans = filterCommands(commands, { search: "ban", category: null });

		expect(groupByCategory(onlyBans, ["info", "moderation"]).map(([name]) => name)).toEqual(["moderation"]);
	});
});

describe("configurableAt", () => {
	it("gives nothing for a command the dashboard cannot configure", () => {
		expect(configurableAt(discordOnly, GUILD)).toBeNull();
	});

	/** Outside a server there is nothing to configure, so the link would have no guild to point at. */
	it("gives nothing when no server is open", () => {
		expect(
			configurableAt(
				commands.find((c) => c.name === "levelling")!,
				null,
			),
		).toBeNull();
	});
});

describe("the commands page", () => {
	it("names the permission a command needs", async () => {
		renderPage();

		expect(await screen.findByText(/needs ban members/i)).toBeInTheDocument();
	});

	/** Quick search sends a command with no screen of its own here, already filtered to it. */
	it("starts filtered to the search in the address, and keeps the address in step", async () => {
		const user = userEvent.setup();
		const { search } = renderWithProviders(<CommandsPage />, { path: "/commands", route: "/commands?q=ban" });
		await screen.findByText("/ban");

		expect(screen.getByRole("searchbox")).toHaveValue("ban");
		expect(screen.queryByText("/levelling")).toBeNull();

		await user.clear(screen.getByRole("searchbox"));
		expect(screen.getByText("/levelling")).toBeInTheDocument();
		expect(search()).toBe("");
	});

	/** The whole point of the coverage tile: it is the visible progress toward covering every command. */
	it("says how much of the command surface the dashboard covers", async () => {
		server.use(
			http.get("/api/commands", () => HttpResponse.json({ ...catalogue, commands: [...commands, discordOnly] })),
		);
		renderPage();

		expect(await screen.findByText("2 of 3")).toBeInTheDocument();
	});
});

describe("CommandsPage accessibility", () => {
	it("has no automatically detectable violations", async () => {
		const { container } = renderPage();
		await screen.findByText("/ban");

		await expectNoViolations(container);
	});
});
