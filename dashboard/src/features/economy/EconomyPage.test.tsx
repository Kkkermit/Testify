import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { EconomyPage } from "@/features/economy/EconomyPage";
import { expectNoViolations } from "@/test/axe";
import { shopRoles, tuning } from "@/test/fixtures/economy";
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

describe("the economy settings page", () => {
	/** Selling a role hands it out, so only roles the bot can give and that do not moderate are offered. */
	it("offers only roles that may be sold, and puts one on sale at the price typed", async () => {
		const sent: { roleId: string; body: unknown }[] = [];
		server.use(
			http.put(`/api/guilds/${GUILD}/shop-roles/:roleId`, async ({ params, request }) => {
				sent.push({ roleId: String(params.roleId), body: await request.json() });
				return HttpResponse.json({ roles: [], canManage: true });
			}),
		);
		renderPage();

		const picker = await screen.findByRole("combobox", { name: "Role" });
		await within(picker).findByRole("option", { name: "Booster" });
		const offered = within(picker)
			.getAllByRole("option")
			.map((option) => option.textContent);
		// Member is already on sale and Admin moderates, so only Booster is left to offer.
		expect(offered).toEqual(["Choose a role", "Booster"]);

		await userEvent.selectOptions(picker, "300000000000000002");
		await userEvent.type(screen.getByLabelText(/^Price$/), "2500");
		await userEvent.click(screen.getByRole("button", { name: "Put on sale" }));

		await waitFor(() => {
			expect(sent).toHaveLength(1);
		});
		expect(sent[0]).toEqual({ roleId: "300000000000000002", body: { price: 2500 } });
	});

	/** Only Manage Roles may choose what the shop sells, so a manager without it is shown the list and no controls. */
	it("shows the roles on sale without their controls to somebody who cannot manage roles", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/shop-roles`, () => HttpResponse.json({ ...shopRoles, canManage: false })),
		);
		renderPage();

		expect(await screen.findByText(/need the Manage Roles permission/)).toBeInTheDocument();
		expect(screen.getByText("Regulars")).toBeInTheDocument();
		expect(screen.getByText("5,000")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Put on sale" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Take Regulars off sale/ })).not.toBeInTheDocument();
		expect(screen.queryByLabelText(/Price of Regulars/)).not.toBeInTheDocument();
	});

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
