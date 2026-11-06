import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { EconomyPage } from "@/features/economy/EconomyPage";
import { expectNoViolations } from "@/test/axe";
import { tuning } from "@/test/fixtures/economy";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<EconomyPage />, { route: `/guilds/${GUILD}/economy`, path: "/guilds/:guildId/economy" });
}

function capture(): unknown[] {
	const sent: unknown[] = [];
	server.use(
		http.patch(`/api/guilds/${GUILD}/tuning`, async ({ request }) => {
			sent.push(await request.json());
			return HttpResponse.json(tuning);
		}),
	);
	return sent;
}

describe("the pay and rates page", () => {
	it("saves a new starting wallet when the field is left, and refuses one out of range", async () => {
		const sent = capture();
		renderPage();

		const field = await screen.findByLabelText(/New accounts start with/);
		await userEvent.clear(field);
		await userEvent.type(field, "250000");
		await userEvent.tab();
		expect(screen.getByText(/whole number from 0 to 100,000/)).toBeInTheDocument();

		await userEvent.clear(field);
		await userEvent.type(field, "1000");
		await userEvent.tab();
		await waitFor(() => {
			expect(sent).toEqual([{ startingWallet: 1000 }]);
		});
	});

	it("switches robbing off and changes the pay rate", async () => {
		const sent = capture();
		renderPage();

		await userEvent.click(await screen.findByRole("switch", { name: /rob each other/ }));
		await userEvent.selectOptions(screen.getByLabelText(/^Pay/), "200");

		await waitFor(() => {
			expect(sent).toEqual([{ robbing: false }, { payRate: 200 }]);
		});
	});

	it("has no automatically detectable violations", async () => {
		const { container } = renderPage();
		await screen.findByLabelText(/New accounts start with/);

		await expectNoViolations(container);
	});
});
