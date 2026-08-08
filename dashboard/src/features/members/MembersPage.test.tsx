import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MembersPage } from "@/features/members/MembersPage";
import { expectNoViolations } from "@/test/axe";
import { economyBoard } from "@/test/handlers";
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

	it("names each member as the row header", async () => {
		renderPage();

		const table = await screen.findByRole("table");
		expect(within(table).getByRole("rowheader", { name: /kate/ })).toBeInTheDocument();
	});

	it("marks the row belonging to whoever is reading", async () => {
		renderPage();

		const row = await screen.findByRole("rowheader", { name: /someone/ });
		expect(within(row).getByText("You")).toBeInTheDocument();
	});

	/** A balance outlives the membership, so the row stays and has to say why the name is a placeholder. */
	it("marks somebody who has left the server", async () => {
		renderPage();

		const row = await screen.findByRole("rowheader", { name: /Left the server/ });
		expect(within(row).getByText("Left")).toBeInTheDocument();
	});

	it("asks for the levels board when the segment is pressed", async () => {
		renderPage();
		await screen.findByRole("table");

		const captured = captureQuery();
		await userEvent.click(screen.getByRole("button", { name: "Top levels" }));

		await waitFor(() => {
			expect(captured.url?.searchParams.get("board")).toBe("levels");
		});
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

	it("jumps to the page holding the reader", async () => {
		serve({ page: 1, you: { rank: 30, page: 2 } });
		renderPage();

		const captured = captureQuery();
		await userEvent.click(await screen.findByRole("button", { name: /Find me/ }));

		await waitFor(() => {
			expect(captured.url?.searchParams.get("page")).toBe("2");
		});
	});

	it("offers no jump when the reader is already on this page", async () => {
		renderPage();
		await screen.findByRole("table");

		expect(screen.queryByRole("button", { name: /Find me/ })).not.toBeInTheDocument();
	});

	it("explains an empty board rather than showing a bare table", async () => {
		serve({ total: 0, rows: [], you: null });
		renderPage();

		expect(await screen.findByText("No rankings yet")).toBeInTheDocument();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	it("has no accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("table");

		await expectNoViolations(container);
	});
});
