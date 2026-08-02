import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { GuildPickerPage } from "@/features/guilds/GuildPickerPage";
import { filterGuilds } from "@/features/guilds/guilds.utils";
import { expectNoViolations } from "@/test/axe";
import { aGuild, cannotAdd, me, withoutBot } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

describe("filterGuilds", () => {
	const guilds = [aGuild, withoutBot];

	it("returns everything for an empty search", () => {
		expect(filterGuilds(guilds, "")).toHaveLength(2);
		expect(filterGuilds(guilds, "   ")).toHaveLength(2);
	});

	it("matches part of a name, ignoring case", () => {
		expect(filterGuilds(guilds, "TEST")).toEqual([aGuild]);
		expect(filterGuilds(guilds, "where")).toEqual([withoutBot]);
	});

	it("returns nothing when nothing matches", () => {
		expect(filterGuilds(guilds, "zzz")).toEqual([]);
	});
});

describe("the guild picker", () => {
	it("lists the servers the API returned", async () => {
		renderWithProviders(<GuildPickerPage />);

		expect(await screen.findByText("Test Server")).toBeInTheDocument();
		expect(screen.getByText("1,234 members")).toBeInTheDocument();
	});

	/** The invite is a real conversion path, so a guild without the bot is shown rather than hidden. */
	/**
	 * Three states, not two. A server you can invite the bot to and one you cannot looked identical before, while
	 * only one of them had an action that would work.
	 */
	it("separates the servers you can add Testify to from the ones you cannot", async () => {
		renderWithProviders(<GuildPickerPage />);

		expect(await screen.findByRole("heading", { name: /ready to configure/i })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: /add testify/i })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: /needs somebody else/i })).toBeInTheDocument();
	});

	it("offers an invite for a server you may add Testify to", async () => {
		renderWithProviders(<GuildPickerPage />);

		const invite = await screen.findByRole("link", { name: /somewhere else/i });
		expect(invite).toHaveAttribute("target", "_blank");
		expect(invite.getAttribute("href")).toContain(`guild_id=${withoutBot.id}`);
	});

	/** Discord would refuse the invite, so offering the button would be a lie rather than a shortcut. */
	it("offers no invite where the viewer lacks Manage Server", async () => {
		renderWithProviders(<GuildPickerPage />);

		expect(await screen.findByText(cannotAdd.name)).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: new RegExp(cannotAdd.name, "i") })).toBeNull();
		expect(screen.getByText(/no permission/i)).toBeInTheDocument();
	});

	it("links through to a guild that can be configured", async () => {
		renderWithProviders(<GuildPickerPage />);

		const link = await screen.findByRole("link", { name: /test server/i });
		expect(link).toHaveAttribute("href", `/guilds/${aGuild.id}`);
	});

	/** Someone in 40 servers should type rather than scroll, so the box is focused on load. */
	it("focuses the search box so typing works immediately", async () => {
		renderWithProviders(<GuildPickerPage />);
		await screen.findByText("Test Server");

		expect(screen.getByRole("searchbox")).toHaveFocus();
	});

	it("narrows the list as you type", async () => {
		const user = userEvent.setup();
		renderWithProviders(<GuildPickerPage />);
		await screen.findByText("Test Server");

		await user.type(screen.getByRole("searchbox"), "somewhere");

		await waitFor(() => {
			expect(screen.queryByText("Test Server")).toBeNull();
		});
		expect(screen.getByText("Somewhere Else")).toBeInTheDocument();
	});

	it("explains an empty search result rather than showing nothing", async () => {
		const user = userEvent.setup();
		renderWithProviders(<GuildPickerPage />);
		await screen.findByText("Test Server");

		await user.type(screen.getByRole("searchbox"), "zzzzz");

		expect(await screen.findByText(/no server matches/i)).toBeInTheDocument();
	});

	/** "No servers" with no explanation reads as a bug; naming the permission tells them what to do. */
	it("explains why the list is empty for someone who manages nothing", async () => {
		server.use(http.get("/api/auth/me", () => HttpResponse.json({ ...me, guilds: [] })));

		renderWithProviders(<GuildPickerPage />);

		expect(await screen.findByText(/nothing to configure yet/i)).toBeInTheDocument();
		expect(screen.getByText(/manage server/i)).toBeInTheDocument();
	});

	it("shows a skeleton rather than an empty page while loading", () => {
		renderWithProviders(<GuildPickerPage />);

		expect(screen.queryByText("Test Server")).toBeNull();
	});
});

describe("GuildPickerPage accessibility", () => {
	it("has no automatically detectable violations", async () => {
		const { container } = renderWithProviders(<GuildPickerPage />, { path: "/guilds" });
		await screen.findByText("Test Server");

		await expectNoViolations(container);
	});
});
