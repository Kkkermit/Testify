import { type AutoResponderList } from "@testify/shared";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AutoRespondersPage } from "@/features/auto-responders/AutoRespondersPage";
import { expectNoViolations } from "@/test/axe";
import { autoResponderList } from "@/test/fixtures/channels";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<AutoRespondersPage />, {
		route: `/guilds/${GUILD}/auto-responders`,
		path: "/guilds/:guildId/auto-responders",
	});
}

const row = async (trigger: string): Promise<HTMLElement> =>
	(await screen.findByRole("heading", { name: trigger })).closest("li") as HTMLElement;

const addCard = (): HTMLElement => screen.getByRole("region", { name: /add an auto-responder/i });

describe("the auto-responders page", () => {
	/** The same rule the API enforces, so the form refuses a repeat before anything is sent. */
	it("refuses words another responder already has", async () => {
		const user = userEvent.setup();
		renderPage();
		await row("rules");

		const card = addCard();
		await user.type(within(card).getByLabelText(/words it answers/i), "RULES");
		await user.type(within(card).getByLabelText(/^Reply/), "x");

		expect(within(card).getByText(/already an auto-responder for those words/i)).toBeInTheDocument();
		expect(within(card).getByRole("button", { name: /add auto-responder/i })).toBeDisabled();
	});

	it("refuses to add another once the server is full", async () => {
		const full: AutoResponderList = {
			limit: 2,
			responders: autoResponderList.responders,
		};
		server.use(http.get(`/api/guilds/${GUILD}/auto-responders`, () => HttpResponse.json(full)));
		renderPage();
		await row("rules");

		expect(within(addCard()).getByText(/as many auto-responders as a server can keep/i)).toBeInTheDocument();
		expect(within(addCard()).getByRole("button", { name: /add auto-responder/i })).toBeDisabled();
	});

	/** A refusal belongs beside the row that caused it, not at the foot of the page. */
	it("shows a refused save inside the row that sent it", async () => {
		const user = userEvent.setup();
		server.use(
			http.put(`/api/guilds/${GUILD}/auto-responders/:id`, () =>
				HttpResponse.json({ error: { code: "bad_request", message: "Keep the reply shorter." } }, { status: 400 }),
			),
		);
		renderPage();

		const rules = await row("rules");
		await user.type(within(rules).getByLabelText(/^Reply/), "!");
		await user.click(within(rules).getByRole("button", { name: /save/i }));

		expect(await within(rules).findByText("Keep the reply shorter.")).toBeInTheDocument();
		expect(within(await row("how do i get roles")).queryByText("Keep the reply shorter.")).toBeNull();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await row("rules");

		await expectNoViolations(container);
	});
});
