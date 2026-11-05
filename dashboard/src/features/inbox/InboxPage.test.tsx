import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { GuildOverviewPage } from "@/features/guild-overview/GuildOverviewPage";
import { InboxPage } from "@/features/inbox/InboxPage";
import { expectNoViolations } from "@/test/axe";
import { busyInbox } from "@/test/fixtures/server";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderInbox(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<InboxPage />, { route: `/guilds/${GUILD}/inbox`, path: "/guilds/:guildId/inbox" });
}

describe("the inbox", () => {
	/** Each row opens where its item is dealt with, and a list cut short says how much it left out. */
	it("lists what is waiting, each pointing at the screen that deals with it", async () => {
		server.use(http.get("/api/guilds/:guildId/inbox", () => HttpResponse.json(busyInbox)));
		const { container } = renderInbox();

		expect(await screen.findByText("6 things need you.")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /Ticket 12/ })).toHaveAttribute("href", `/guilds/${GUILD}/tickets`);
		expect(screen.getByRole("link", { name: "2 more" })).toHaveAttribute("href", `/guilds/${GUILD}/tickets`);
		expect(screen.getByRole("link", { name: /Idea 4: A music quiz night/ })).toHaveAttribute(
			"href",
			`/guilds/${GUILD}/ideas`,
		);
		expect(await screen.findByRole("link", { name: /cannot post in #locked/ })).toHaveAttribute(
			"href",
			`/guilds/${GUILD}/audit-log`,
		);
		await expectNoViolations(container);
	});

	it("says nothing is waiting rather than drawing empty lists", async () => {
		renderInbox();

		expect(await screen.findByText("Nothing needs you right now.")).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Nothing waiting" })).toBeInTheDocument();
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
	});

	/** An inbox that failed to read must not look like an empty one, which says all is well. */
	it("says so when it cannot be read", async () => {
		server.use(http.get("/api/guilds/:guildId/inbox", () => HttpResponse.json({}, { status: 500 })));
		renderInbox();

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
		expect(screen.queryByText("Nothing needs you right now.")).not.toBeInTheDocument();
	});

	it("puts one line on the overview while something is waiting", async () => {
		server.use(http.get("/api/guilds/:guildId/inbox", () => HttpResponse.json(busyInbox)));
		renderWithProviders(<GuildOverviewPage />, { route: `/guilds/${GUILD}`, path: "/guilds/:guildId" });

		expect(await screen.findByRole("link", { name: /6 things need you\. Open the inbox/ })).toHaveAttribute(
			"href",
			`/guilds/${GUILD}/inbox`,
		);
	});
});
