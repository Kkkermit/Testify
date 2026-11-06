import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { ModmailPage } from "@/features/modmail/ModmailPage";
import { expectNoViolations } from "@/test/axe";
import { modmailConversations } from "@/test/fixtures/moderation";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<ModmailPage />, { route: `/guilds/${GUILD}/modmail`, path: "/guilds/:guildId/modmail" });
}

describe("the mod mail page", () => {
	it("closes a conversation from its row", async () => {
		const closed: string[] = [];
		server.use(
			http.post(`/api/guilds/${GUILD}/modmail/conversations/:conversationId/close`, ({ params }) => {
				closed.push(String(params.conversationId));
				return HttpResponse.json(modmailConversations.items[0]);
			}),
		);
		renderPage();

		await userEvent.click(await screen.findByRole("button", { name: "Close the conversation with kate" }));

		await waitFor(() => {
			expect(closed).toEqual(["c".repeat(24)]);
		});
	});

	/** Discord would hide the threads from somebody who cannot see the channel, so the page says so instead of listing. */
	it("says why the conversations are hidden rather than showing none", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/modmail/conversations`, () => HttpResponse.json({ visible: false, items: [] })),
		);
		renderPage();

		expect(await screen.findByText(/conversations are hidden here too/)).toBeInTheDocument();
		expect(screen.queryByText("No open conversations")).toBeNull();
	});

	it("has no automatically detectable violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { name: "kate" });

		await expectNoViolations(container);
	});
});
