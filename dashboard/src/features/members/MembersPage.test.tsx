import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MembersPage } from "@/features/members/MembersPage";
import { expectNoViolations } from "@/test/axe";
import { economyBoard } from "@/test/fixtures/community";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(route = `/guilds/${GUILD}/members`): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<MembersPage />, { route, path: "/guilds/:guildId/members" });
}

function serve(page: Partial<typeof economyBoard>): void {
	server.use(
		http.get(`/api/guilds/${GUILD}/members/leaderboard`, () => HttpResponse.json({ ...economyBoard, ...page })),
	);
}

function captureQuery(): { url: URL | null } {
	const captured: { url: URL | null } = { url: null };
	server.use(
		http.get(`/api/guilds/${GUILD}/members/leaderboard`, ({ request }) => {
			captured.url = new URL(request.url);
			return HttpResponse.json(economyBoard);
		}),
	);
	return captured;
}

describe("the members page", () => {
	/** A leaderboard is tabular data; a list of divs cannot be navigated by a screen reader's table commands. */
	it("renders the board as a real table with a caption", async () => {
		renderPage();

		const table = await screen.findByRole("table");
		expect(within(table).getByRole("columnheader", { name: "Total" })).toBeInTheDocument();
		expect(within(table).getByRole("columnheader", { name: "Banked" })).toBeInTheDocument();
		expect(table.querySelector("caption")?.textContent).toContain("Richest");
	});

	/** The figure a board is named after stays visible at every width. */
	it("keeps the figure the board is named after at every width", async () => {
		renderPage();

		const table = await screen.findByRole("table");
		expect(table).toHaveClass("table-fixed");
		expect(within(table).getByRole("columnheader", { name: "Total" })).not.toHaveClass("hidden");
		expect(within(table).getByRole("columnheader", { name: "Banked" })).toHaveClass("hidden", "sm:table-cell");
	});

	/** A balance outlives the membership, so the row stays and has to say why the name is a placeholder. */
	it("marks somebody who has left the server", async () => {
		renderPage();

		const row = await screen.findByRole("rowheader", { name: /Left the server/ });
		expect(within(row).getByText("Left")).toBeInTheDocument();
	});

	/** Switching board while on page 4 of the other one would otherwise land on an empty page. */
	it("goes back to the first page when the board changes", async () => {
		renderPage(`/guilds/${GUILD}/members?page=2`);
		await screen.findByRole("table");

		const captured = captureQuery();
		await userEvent.click(screen.getByRole("button", { name: "Top levels" }));

		await waitFor(() => {
			expect(captured.url?.searchParams.get("page")).toBe("1");
		});
	});

	it("names the columns after the sort", async () => {
		serve({ sort: "bank" });
		renderPage(`/guilds/${GUILD}/members?sort=bank`);

		const table = await screen.findByRole("table");
		expect(within(table).getByRole("columnheader", { name: "Bank" })).toBeInTheDocument();
		expect(within(table).getByRole("columnheader", { name: "Wallet" })).toBeInTheDocument();
		expect(table.querySelector("caption")?.textContent).toContain("Biggest banks in this server");
	});

	/** The levels board has one figure and one server, so offering a sort or scope there would do nothing. */
	it("offers the sort and scope only on the money board", async () => {
		renderPage(`/guilds/${GUILD}/members?board=levels&sort=wallet&scope=global`);
		await screen.findByRole("table");

		expect(screen.queryByRole("button", { name: "Every server" })).not.toBeInTheDocument();
	});

	/** Somebody from another server has no page here, and is not somebody who left this one. */
	it("neither links nor marks as left somebody on the bot-wide board from another server", async () => {
		serve({ scope: "global" });
		renderPage(`/guilds/${GUILD}/members?scope=global`);

		const row = await screen.findByRole("rowheader", { name: /Left the server/ });
		expect(within(row).queryByRole("link")).not.toBeInTheDocument();
		expect(within(row).queryByText("Left")).not.toBeInTheDocument();
		expect(within(await screen.findByRole("rowheader", { name: /kate/ })).getByRole("link")).toBeInTheDocument();
		expect(screen.getByRole("table").querySelector("caption")?.textContent).toContain("across every server");
	});

	it("has no accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("table");

		await expectNoViolations(container);
	});
});
