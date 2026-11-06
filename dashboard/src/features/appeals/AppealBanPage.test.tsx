import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AppealBanPage } from "@/features/appeals/AppealBanPage";
import { expectNoViolations } from "@/test/axe";
import { ownAppeals } from "@/test/fixtures/moderation";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<AppealBanPage />, { route: "/appeals", path: "/appeals" });
}

function cardFor(name: string): HTMLElement {
	return screen.getByRole("heading", { name, level: 2 }).closest("li") ?? document.body;
}

describe("the appeal a ban page", () => {
	it("sends what was typed to the server it was typed for, once it is long enough", async () => {
		const sent: { guildId: string; text: unknown }[] = [];
		server.use(
			http.post("/api/appeals/:guildId", async ({ params, request }) => {
				sent.push({ guildId: String(params.guildId), ...((await request.json()) as { text: unknown }) });
				return HttpResponse.json(ownAppeals.appeals[0], { status: 201 });
			}),
		);
		renderPage();

		await screen.findByRole("heading", { name: "Testify HQ", level: 2 });
		const card = cardFor("Testify HQ");
		const send = within(card).getByRole("button", { name: "Send appeal" });

		await userEvent.type(within(card).getByLabelText(/Your appeal/), "Sorry");
		expect(send).toBeDisabled();
		await userEvent.type(within(card).getByLabelText(/Your appeal/), ", I broke the rules and will not again.");
		await userEvent.click(send);

		await waitFor(() => {
			expect(sent).toEqual([{ guildId: "900000000000000001", text: "Sorry, I broke the rules and will not again." }]);
		});
	});

	/** A refused appeal holds back the next one, so the page says when rather than offering a form the API refuses. */
	it("shows when a refused member may appeal again instead of the form, and the reason they were given", async () => {
		renderPage();

		await screen.findByRole("heading", { name: "Side Project", level: 2 });
		expect(within(cardFor("Side Project")).queryByRole("button", { name: "Send appeal" })).toBeNull();
		expect(within(cardFor("Side Project")).getByText(/You can appeal again/)).toBeInTheDocument();
		expect(screen.getByText("Not this time.")).toBeInTheDocument();
	});

	it("has no automatically detectable violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { name: "Testify HQ", level: 2 });

		await expectNoViolations(container);
	});
});
