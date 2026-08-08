import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemberDetailPage } from "@/features/members/MemberDetailPage";
import { expectNoViolations } from "@/test/axe";
import { memberDetail } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";
const USER = "100000000000000002";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<MemberDetailPage />, {
		route: `/guilds/${GUILD}/members/${USER}`,
		path: "/guilds/:guildId/members/:userId",
	});
}

function serve(detail: Partial<typeof memberDetail>): void {
	server.use(http.get(`/api/guilds/${GUILD}/members/${USER}`, () => HttpResponse.json({ ...memberDetail, ...detail })));
}

function captureWarn(): { body: Record<string, unknown> | null } {
	const captured: { body: Record<string, unknown> | null } = { body: null };
	server.use(
		http.post(`/api/guilds/${GUILD}/members/${USER}/warnings`, async ({ request }) => {
			captured.body = (await request.json()) as Record<string, unknown>;
			return HttpResponse.json(memberDetail);
		}),
	);
	return captured;
}

describe("the member detail page", () => {
	it("shows who they are and where they stand", async () => {
		renderPage();

		expect(await screen.findByRole("heading", { name: "kate", level: 1 })).toBeInTheDocument();
		expect(screen.getByText("Wallet")).toBeInTheDocument();
		expect(screen.getByText("Level rank")).toBeInTheDocument();
	});

	it("lists the warnings on record", async () => {
		renderPage();

		expect(await screen.findByText("Spamming in general")).toBeInTheDocument();
		expect(screen.getByText("1 warning on record.")).toBeInTheDocument();
	});

	it("sends the reason that was typed", async () => {
		renderPage();
		await screen.findByText("Spamming in general");

		const captured = captureWarn();
		await userEvent.type(screen.getByLabelText(/Issue a warning/), "Being rude");
		await userEvent.click(screen.getByRole("button", { name: "Add warning" }));

		await waitFor(() => {
			expect(captured.body).toEqual({ reason: "Being rude" });
		});
	});

	it("will not send an empty reason", async () => {
		renderPage();
		await screen.findByText("Spamming in general");

		expect(screen.getByRole("button", { name: "Add warning" })).toBeDisabled();
	});

	/**
	 * Hiding the controls is a courtesy rather than the gate, but showing an Add button beside a refusal the
	 * server will issue anyway is the worst of both.
	 */
	it("offers no moderation controls when the caller may not act", async () => {
		serve({ moderationProblem: "You cannot moderate somebody above you." });
		renderPage();

		expect(await screen.findByText("You cannot moderate somebody above you.")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Add warning" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Clear every warning/ })).not.toBeInTheDocument();
	});

	it("still shows the record for somebody who has left", async () => {
		serve({ inGuild: false, moderationProblem: "They are no longer in this server." });
		renderPage();

		expect(await screen.findByText("Left the server")).toBeInTheDocument();
		expect(screen.getByText("Spamming in general")).toBeInTheDocument();
	});

	/** Clearing deletes a record nothing can recover, so a single click must not be enough. */
	it("asks for the name before clearing every warning", async () => {
		renderPage();
		await screen.findByText("Spamming in general");

		let deleted = false;
		server.use(
			http.delete(`/api/guilds/${GUILD}/members/${USER}/warnings`, () => {
				deleted = true;
				return HttpResponse.json({ ...memberDetail, warnings: [] });
			}),
		);

		await userEvent.click(screen.getByRole("button", { name: /Clear every warning/ }));
		const confirm = screen.getByRole("button", { name: "Clear every warning" });
		expect(confirm).toBeDisabled();
		expect(deleted).toBe(false);

		await userEvent.type(screen.getByLabelText(/Type kate to clear/), "kate");
		expect(screen.getByRole("button", { name: "Clear every warning" })).toBeEnabled();
	});

	it("removes a single warning", async () => {
		renderPage();
		await screen.findByText("Spamming in general");

		let removed: string | null = null;
		server.use(
			http.delete(`/api/guilds/${GUILD}/members/${USER}/warnings/:warnId`, ({ params }) => {
				removed = params.warnId as string;
				return HttpResponse.json({ ...memberDetail, warnings: [] });
			}),
		);

		await userEvent.click(screen.getByRole("button", { name: /Remove the warning/ }));

		await waitFor(() => {
			expect(removed).toBe("a1b2c3d4");
		});
	});

	it("shows the softban when one is live", async () => {
		serve({
			softban: { reason: "Repeated spam", moderatorId: "1", expiresAt: "2099-01-01T00:00:00.000Z" },
		});
		renderPage();

		expect(await screen.findByText("Repeated spam")).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: /Active softban/ })).toBeInTheDocument();
		expect(screen.getByText("Softbanned")).toBeInTheDocument();
	});

	it("has no accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByText("Spamming in general");

		await expectNoViolations(container);
	});
});
