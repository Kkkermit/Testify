import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { durationText } from "@/features/cases/cases.utils";
import { CasesPage } from "@/features/cases/CasesPage";
import { expectNoViolations } from "@/test/axe";
import { casePage } from "@/test/fixtures/moderation";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<CasesPage />, { route: `/guilds/${GUILD}/cases`, path: "/guilds/:guildId/cases" });
}

describe("durationText", () => {
	it("words a length in its largest whole unit", () => {
		expect(durationText(7 * 86_400_000, "en-GB")).toBe("7 days");
		expect(durationText(2 * 3_600_000, "en-GB")).toBe("2 hours");
		expect(durationText(90 * 60_000, "en-GB")).toBe("90 minutes");
	});
});

describe("the cases page", () => {
	it("lists each case with its number, what was done and for how long", async () => {
		renderPage();

		const list = await screen.findByRole("region", { name: /all cases/i });
		expect(await within(list).findByText("Case 2")).toBeInTheDocument();
		expect(within(list).getByText("Softban", { selector: "span" })).toBeInTheDocument();
		expect(within(list).getByText(/for 7 days/)).toBeInTheDocument();
		expect(within(list).getByRole("link", { name: "kit" })).toHaveAttribute(
			"href",
			`/guilds/${GUILD}/members/100000000000000002`,
		);
	});

	/** A warning from before cases is listed rather than dropped, and says it has no number. */
	it("shows a warning from before cases, unnumbered", async () => {
		renderPage();

		expect(await screen.findByText("Earlier warning")).toBeInTheDocument();
	});

	it("asks for what is searched and filtered, starting again from the first page", async () => {
		const user = userEvent.setup();
		const asked: string[] = [];
		server.use(
			http.get("/api/guilds/:guildId/cases", ({ request }) => {
				asked.push(new URL(request.url).search);
				return HttpResponse.json(casePage);
			}),
		);
		renderPage();
		await screen.findByText("Case 2");

		await user.selectOptions(screen.getByLabelText("What was done"), "ban");
		await user.type(screen.getByLabelText(/^Search/), "raid");

		await waitFor(() => {
			expect(asked.at(-1)).toBe("?q=raid&action=ban");
		});
	});

	it("says so when nothing matches", async () => {
		server.use(
			http.get("/api/guilds/:guildId/cases", () => HttpResponse.json({ items: [], total: 0, page: 1, perPage: 10 })),
		);
		renderPage();

		expect(await screen.findByText("No cases")).toBeInTheDocument();
	});

	it("sets where cases are posted, and can stop posting them", async () => {
		const user = userEvent.setup();
		let body: unknown;
		server.use(
			http.put("/api/guilds/:guildId/cases/settings", async ({ request }) => {
				body = await request.json();
				return HttpResponse.json({ logChannelId: null, canSend: false });
			}),
		);
		renderPage();

		await user.selectOptions(await screen.findByLabelText(/^Post new cases in/), "");

		await waitFor(() => {
			expect(body).toEqual({ logChannelId: null });
		});
	});

	it("warns when the bot cannot post in the log channel", async () => {
		server.use(
			http.get("/api/guilds/:guildId/cases/settings", () =>
				HttpResponse.json({ logChannelId: "400000000000000001", canSend: false }),
			),
		);
		renderPage();

		expect(await screen.findByText(/recorded but not posted/i)).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByText("Case 2");

		await expectNoViolations(container);
	});
});
