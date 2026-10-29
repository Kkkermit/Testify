import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
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

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("switch", { name: /post birthdays/i });

		await expectNoViolations(container);
	});
});
