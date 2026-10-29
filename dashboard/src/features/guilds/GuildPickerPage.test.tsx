import { type ManageableGuild } from "@testify/shared";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { GuildPickerPage } from "@/features/guilds/GuildPickerPage";
import { expectNoViolations } from "@/test/axe";
import { aGuild, cannotAdd, me, withoutBot } from "@/test/fixtures/session";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

describe("the guild picker", () => {
	/** The invite is a real conversion path, so a guild without the bot is shown rather than hidden. */
	/** Three states, not two: a server you can invite the bot to and one you cannot looked identical while only one had an action that would work. */
	it("separates the servers you can add Testify to from the ones you cannot", async () => {
		renderWithProviders(<GuildPickerPage />);

		expect(await screen.findByRole("heading", { name: /ready to configure/i })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: /add testify/i })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: /needs somebody else/i })).toBeInTheDocument();
	});

	/** Discord would refuse the invite, so offering the button would be a lie rather than a shortcut. */
	it("offers no invite where the viewer lacks Manage Server", async () => {
		renderWithProviders(<GuildPickerPage />);

		expect(await screen.findByText(cannotAdd.name)).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: new RegExp(cannotAdd.name, "i") })).toBeNull();
		expect(screen.getByText(/no permission/i)).toBeInTheDocument();
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
