import { type ManageableGuild } from "@testify/shared";
import { screen, waitFor, within } from "@testing-library/react";
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
	/** Three states, not two: a server you can invite the bot to and one you cannot looked identical while only one had an action that would work. */
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

	/** Autofocus costs a phone user the keyboard over the list, and pays back only on a list worth searching. */
	it("leaves the search box alone on a list short enough to read", async () => {
		renderWithProviders(<GuildPickerPage />);
		await screen.findByText("Test Server");

		expect(screen.getByRole("searchbox")).not.toHaveFocus();
	});

	it("focuses the search box once scrolling beats typing", async () => {
		server.use(
			http.get("/api/auth/me", () =>
				HttpResponse.json({
					...me,
					guilds: Array.from({ length: 12 }, (_, index) => ({
						...aGuild,
						id: `90000000000000${String(index).padStart(4, "0")}`,
						name: `Server ${String(index)}`,
					})),
				}),
			),
		);

		renderWithProviders(<GuildPickerPage />);
		await screen.findByText("Server 0");

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

function many(count: number, template: ManageableGuild, prefix: string, from = 0): ManageableGuild[] {
	return Array.from({ length: count }, (_, index) => ({
		...template,
		id: `9${String(from + index).padStart(17, "0")}`,
		name: `${prefix} ${String(index + 1).padStart(2, "0")}`,
	}));
}

function serve(guilds: ManageableGuild[]): void {
	server.use(http.get("/api/auth/me", () => HttpResponse.json({ ...me, guilds })));
}

function section(name: RegExp): HTMLElement {
	const heading = screen.getByRole("heading", { name });
	const found = heading.closest("section");
	if (found === null) throw new Error("heading is not inside a section");
	return found;
}

describe("the guild picker's pages", () => {
	/** Somebody who manages dozens of servers scrolled past all of them to reach the next heading. */
	it("shows ten servers to a section, and the rest a page at a time", async () => {
		const user = userEvent.setup();
		serve(many(23, aGuild, "Ready"));
		const { search } = renderWithProviders(<GuildPickerPage />);
		await screen.findByText("Ready 01");

		const ready = section(/ready to configure/i);
		expect(within(ready).getAllByRole("link")).toHaveLength(10);
		expect(within(ready).getByText("Page 1 of 3")).toBeInTheDocument();

		await user.click(within(ready).getByRole("button", { name: "Next" }));

		expect(await within(ready).findByText("Ready 11")).toBeInTheDocument();
		expect(within(ready).queryByText("Ready 01")).toBeNull();
		expect(search()).toBe("?configurable=2");
	});

	it("pages each section on its own", async () => {
		const user = userEvent.setup();
		serve([...many(12, aGuild, "Ready"), ...many(12, withoutBot, "Invite", 100)]);
		renderWithProviders(<GuildPickerPage />);
		await screen.findByText("Ready 01");

		await user.click(within(section(/add testify/i)).getByRole("button", { name: "Next" }));

		expect(await screen.findByText("Invite 11")).toBeInTheDocument();
		expect(screen.getByText("Ready 01")).toBeInTheDocument();
	});

	it("opens on the page the URL names, and the last page when the URL overshoots", async () => {
		serve(many(23, aGuild, "Ready"));
		renderWithProviders(<GuildPickerPage />, { route: "/?configurable=9", path: "/" });

		expect(await screen.findByText("Ready 21")).toBeInTheDocument();
		expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
	});

	it("starts every section again from its first page when the search changes", async () => {
		const user = userEvent.setup();
		serve(many(23, aGuild, "Ready"));
		const { search } = renderWithProviders(<GuildPickerPage />, { route: "/?configurable=3", path: "/" });
		await screen.findByText("Ready 21");

		await user.type(screen.getByRole("searchbox"), "Ready");

		expect(await screen.findByText("Ready 01")).toBeInTheDocument();
		expect(search()).toBe("");
	});

	/** Two navigation landmarks both called "Pages" cannot be told apart in a screen reader's list of them. */
	it("names each section's pager after the section", async () => {
		serve([...many(12, aGuild, "Ready"), ...many(12, withoutBot, "Invite", 100)]);
		const { container } = renderWithProviders(<GuildPickerPage />);
		await screen.findByText("Ready 01");

		expect(screen.getByRole("navigation", { name: "Pages of Ready to configure" })).toBeInTheDocument();
		expect(screen.getByRole("navigation", { name: "Pages of Add Testify" })).toBeInTheDocument();
		await expectNoViolations(container);
	});

	it("shows no pager for a section that fits on one page", async () => {
		renderWithProviders(<GuildPickerPage />);
		await screen.findByText("Test Server");

		expect(screen.queryByRole("navigation")).toBeNull();
	});
});

describe("GuildPickerPage accessibility", () => {
	it("has no automatically detectable violations", async () => {
		const { container } = renderWithProviders(<GuildPickerPage />, { path: "/guilds" });
		await screen.findByText("Test Server");

		await expectNoViolations(container);
	});
});
