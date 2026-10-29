import { type IdeaDecision } from "@testify/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { IdeasPage } from "@/features/ideas/IdeasPage";
import { expectNoViolations } from "@/test/axe";
import { ideaPage } from "@/test/fixtures/community";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";
const OPEN_IDEA = ideaPage.items[0]?.id ?? "";

function renderPage(query = ""): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<IdeasPage />, {
		route: `/guilds/${GUILD}/ideas${query}`,
		path: "/guilds/:guildId/ideas",
	});
}

function rowFor(heading: string): HTMLElement {
	return screen.getByRole("heading", { name: heading }).closest("li") ?? document.body;
}

describe("the idea board page", () => {
	/** Deciding here goes through the same path as the staff buttons, so the reason typed is the one the author gets. */
	it("accepts an idea with the reason typed beside it", async () => {
		const sent: { id: string; body: IdeaDecision }[] = [];
		server.use(
			http.post(`/api/guilds/${GUILD}/ideas/:ideaId/decision`, async ({ params, request }) => {
				sent.push({ id: String(params.ideaId), body: (await request.json()) as IdeaDecision });
				return HttpResponse.json(ideaPage.items[0]);
			}),
		);
		renderPage();

		await screen.findByRole("heading", { name: "Idea #2" });
		const open = rowFor("Idea #2");
		await userEvent.type(within(open).getByLabelText(/Reason/), "Love it");
		await userEvent.click(within(open).getByRole("button", { name: "Accept" }));

		await waitFor(() => {
			expect(sent).toEqual([{ id: OPEN_IDEA, body: { status: "accepted", reason: "Love it" } }]);
		});
	});

	/** A failed list read must not look like an empty board. */
	it("says the list could not be read rather than showing none", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/ideas/list`, () => HttpResponse.json({}, { status: 500 })));
		renderPage();

		expect(await screen.findByRole("button", { name: /Try again/ })).toBeInTheDocument();
		expect(screen.queryByText("No ideas yet")).toBeNull();
	});

	it("has no automatically detectable violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { name: "Idea #2" });

		await expectNoViolations(container);
	});
});
