import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { BirthdaysPage } from "@/features/birthdays/BirthdaysPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<BirthdaysPage />, {
		route: `/guilds/${GUILD}/birthdays`,
		path: "/guilds/:guildId/birthdays",
	});
}

describe("the birthdays page", () => {
	it("puts the switch back and says why when the server refuses", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch("/api/guilds/:guildId/birthdays", () =>
				HttpResponse.json(
					{ error: { code: "bad_request", message: "I cannot post in that channel." } },
					{ status: 400 },
				),
			),
		);
		renderPage();

		const toggle = await screen.findByRole("switch", { name: /post birthdays/i });
		await user.click(toggle);

		expect(await screen.findByText("I cannot post in that channel.")).toBeInTheDocument();
		expect(toggle).toBeChecked();
	});

	/** The rollback of a refused save put the saved text back, so what was typed was lost beside the refusal. */
	it("keeps a refused message in the editor", async () => {
		const user = userEvent.setup();
		server.use(
			// Held back so the optimistic message is drawn before the rollback, as it is over a real network.
			http.patch("/api/guilds/:guildId/birthdays", async () => {
				await delay(50);
				return HttpResponse.json(
					{ error: { code: "bad_request", message: "That message is too long." } },
					{ status: 400 },
				);
			}),
		);
		renderPage();

		const editor = await screen.findByRole("textbox", { name: /birthday message/i });
		await user.clear(editor);
		await user.type(editor, "Many happy returns");
		await user.click(screen.getByRole("button", { name: /save message/i }));

		expect(await screen.findByText("That message is too long.")).toBeInTheDocument();
		expect(editor).toHaveValue("Many happy returns");
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("switch", { name: /post birthdays/i });

		await expectNoViolations(container);
	});
});
