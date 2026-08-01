import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
	configurableAt,
	coverage,
	filterCommands,
	groupByCategory,
	isConfigurable,
} from "@/features/commands/commands.utils";
import { CommandsPage } from "@/features/commands/CommandsPage";
import { expectNoViolations } from "@/test/axe";
import { catalogue } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";

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

describe("filterCommands", () => {
	it("finds a command by name", () => {
		expect(filterCommands(commands, { search: "ban", category: null }).map((c) => c.name)).toEqual(["ban"]);
	});

	/** Somebody who knows the prefix form should not have to know the slash name to find it. */
	it("finds a command by its prefix alias", () => {
		expect(filterCommands(commands, { search: "b", category: null }).some((c) => c.name === "ban")).toBe(true);
	});

	it("finds a command by a subcommand's name", () => {
		expect(filterCommands(commands, { search: "setup", category: null }).map((c) => c.name)).toEqual(["levelling"]);
	});

	it("narrows to a category", () => {
		expect(filterCommands(commands, { search: "", category: "moderation" }).map((c) => c.name)).toEqual(["ban"]);
	});

	it("returns everything for an empty search", () => {
		expect(filterCommands(commands, { search: "   ", category: null })).toHaveLength(commands.length);
	});
});

describe("groupByCategory", () => {
	it("keeps the order the categories arrived in", () => {
		expect(groupByCategory(commands, ["info", "moderation"]).map(([name]) => name)).toEqual(["info", "moderation"]);
	});

	/** An empty category heading with nothing under it reads as a rendering bug. */
	it("drops a category with nothing left in it after filtering", () => {
		const onlyBans = filterCommands(commands, { search: "ban", category: null });

		expect(groupByCategory(onlyBans, ["info", "moderation"]).map(([name]) => name)).toEqual(["moderation"]);
	});
});

describe("configurableAt", () => {
	it("points a covered command at its settings screen", () => {
		expect(
			configurableAt(
				commands.find((c) => c.name === "levelling")!,
				GUILD,
			),
		).toEqual({
			path: `/guilds/${GUILD}/levelling`,
			screen: "Levelling",
		});
	});

	it("gives nothing for a command the dashboard cannot configure", () => {
		expect(
			configurableAt(
				commands.find((c) => c.name === "ban")!,
				GUILD,
			),
		).toBeNull();
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

describe("coverage", () => {
	it("counts how much of the command surface the dashboard reaches", () => {
		expect(coverage(commands)).toEqual({ covered: 1, total: 2 });
	});

	it("agrees with isConfigurable", () => {
		expect(commands.filter(isConfigurable)).toHaveLength(coverage(commands).covered);
	});
});

describe("the commands page", () => {
	it("lists every command, grouped by category", async () => {
		renderPage();

		expect(await screen.findByText("/ban")).toBeInTheDocument();
		expect(screen.getByText("/levelling")).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: /moderation/i })).toBeInTheDocument();
	});

	it("shows the prefix form beside the slash name", async () => {
		renderPage();

		expect(await screen.findByText("t?b")).toBeInTheDocument();
	});

	it("names the permission a command needs", async () => {
		renderPage();

		expect(await screen.findByText(/needs ban members/i)).toBeInTheDocument();
	});

	it("lists a command's subcommands", async () => {
		renderPage();

		expect(await screen.findByText("/levelling setup")).toBeInTheDocument();
	});

	it("filters as you type", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByText("/ban");

		await user.type(screen.getByRole("searchbox"), "levelling");

		expect(screen.queryByText("/ban")).toBeNull();
		expect(screen.getByText("/levelling")).toBeInTheDocument();
	});

	it("filters by category, and clears when the same chip is pressed again", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByText("/ban");

		const chip = screen.getByRole("button", { name: "moderation" });
		await user.click(chip);
		expect(screen.queryByText("/levelling")).toBeNull();

		await user.click(chip);
		expect(screen.getByText("/levelling")).toBeInTheDocument();
	});

	it("explains an empty result rather than showing nothing", async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByText("/ban");

		await user.type(screen.getByRole("searchbox"), "nothing matches this");

		expect(screen.getByText(/no command matches that/i)).toBeInTheDocument();
	});

	/** The whole point of the coverage tile: it is the visible progress toward covering every command. */
	it("says how much of the command surface the dashboard covers", async () => {
		renderPage();

		expect(await screen.findByText("1 of 2")).toBeInTheDocument();
	});

	it("links a covered command to the screen that replaces it", async () => {
		renderPage();
		await screen.findByText("/levelling");

		expect(screen.getByRole("link", { name: /configure/i })).toHaveAttribute("href", `/guilds/${GUILD}/levelling`);
	});

	it("offers no Configure link outside a server", async () => {
		renderPage(false);
		await screen.findByText("/levelling");

		expect(screen.queryByRole("link", { name: /configure/i })).toBeNull();
	});

	it("marks required options apart from optional ones", async () => {
		renderPage();
		await screen.findByText("/ban");

		const card = screen.getByText("/ban").closest<HTMLElement>("div.bg-card")!;
		expect(within(card).getByText("user")).toBeInTheDocument();
	});
});

describe("CommandsPage accessibility", () => {
	it("has no automatically detectable violations", async () => {
		const { container } = renderPage();
		await screen.findByText("/ban");

		await expectNoViolations(container);
	});
});
