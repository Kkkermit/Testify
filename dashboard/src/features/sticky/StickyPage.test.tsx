import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { StickyPage } from "@/features/sticky/StickyPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<StickyPage />, { route: `/guilds/${GUILD}/sticky`, path: "/guilds/:guildId/sticky" });
}

describe("the sticky page", () => {
	it("lists a sticky against its channel name rather than its id", async () => {
		renderPage();

		expect(await screen.findByRole("heading", { name: "#general" })).toBeInTheDocument();
	});

	/** The count is the reason a sticky has not reposted yet, and the only way to see it is here. */
	it("shows how far through the repost count each one is", async () => {
		renderPage();

		expect(await screen.findByText(/3 of 5 messages since the last post/i)).toBeInTheDocument();
	});

	/** A configuration that cannot work should say so here rather than by silently never posting. */
	it("warns when Testify cannot post in the channel", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/sticky`, () =>
				HttpResponse.json({
					limit: 25,
					entries: [
						{
							channelId: "400000000000000001",
							message: "Read the rules",
							cap: 5,
							count: 3,
							posted: true,
							canSend: false,
						},
					],
				}),
			),
		);
		renderPage();

		expect(await screen.findByText(/cannot post in #general/i)).toBeInTheDocument();
	});

	/** One sticky per channel is a unique index, so a channel already used must not be offered again. */
	it("does not offer a channel that already has a sticky", async () => {
		renderPage();

		const picker = await screen.findByLabelText(/^Channel/);
		expect(picker).toBeInTheDocument();
		expect(screen.queryByRole("option", { name: "#general" })).not.toBeInTheDocument();
	});

	it("refuses to add one with no message", async () => {
		renderPage();
		await screen.findByRole("heading", { name: "#general" });

		expect(screen.getByRole("button", { name: /add sticky/i })).toBeDisabled();
	});

	it("removes one", async () => {
		const user = userEvent.setup();
		const { client } = renderPage();
		await screen.findByRole("heading", { name: "#general" });

		// The refetch on settle is what decides, so the list has to agree with the delete it just answered.
		const empty = { limit: 25, entries: [] };
		server.use(
			http.delete(`/api/guilds/${GUILD}/sticky/:channelId`, () => HttpResponse.json(empty)),
			http.get(`/api/guilds/${GUILD}/sticky`, () => HttpResponse.json(empty)),
		);

		await user.click(screen.getByRole("button", { name: /remove the sticky in general/i }));

		await waitFor(() => {
			expect(client.isMutating()).toBe(0);
		});
		// The channel comes back as an option in the add picker, so the row's own heading is what to assert on.
		await waitFor(() => {
			expect(screen.queryByRole("heading", { name: "#general" })).not.toBeInTheDocument();
		});
	});

	it("says so when there are none rather than showing an empty list", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/sticky`, () => HttpResponse.json({ limit: 25, entries: [] })));
		renderPage();

		expect(await screen.findByText(/no sticky messages yet/i)).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { name: "#general" });

		await expectNoViolations(container);
	});
});
