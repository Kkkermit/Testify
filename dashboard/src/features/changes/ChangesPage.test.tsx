import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { ChangesPage } from "@/features/changes/ChangesPage";
import { expectNoViolations } from "@/test/axe";
import { levelConfig } from "@/test/fixtures/community";
import { serverChanges } from "@/test/fixtures/moderation";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<ChangesPage />, { route: `/guilds/${GUILD}/changes`, path: "/guilds/:guildId/changes" });
}

describe("the changes page", () => {
	it("lists what Discord recorded beside what the dashboard did", async () => {
		renderPage();

		expect(await screen.findByText("marcus")).toBeInTheDocument();
		expect(screen.getByText("Banned")).toBeInTheDocument();
		expect(screen.getByText("Reason: Spamming invites")).toBeInTheDocument();
		expect(screen.getByText("Turned levelling on")).toBeInTheDocument();
		expect(screen.getByText(/By kate on the dashboard/)).toBeInTheDocument();
	});

	/** Without the permission the list would silently look like nothing happened in Discord. */
	it("says why Discord's changes are missing when the bot cannot read them", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/changes`, () =>
				HttpResponse.json({ ...serverChanges, items: [], total: 0, discordReadable: false }),
			),
		);
		renderPage();

		expect(await screen.findByText(/Give the bot View Audit Log/)).toBeInTheDocument();
		expect(screen.getByText("Nothing changed in this period.")).toBeInTheDocument();
	});

	/** Withheld because of the reader, not the bot, so the advice is about the reader's own permission. */
	it("says which of the reader's permissions each missing record needs", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/changes`, () =>
				HttpResponse.json({ ...serverChanges, discordWithheld: true, moderationWithheld: true }),
			),
		);
		renderPage();

		expect(await screen.findByText(/You need the View Audit Log permission/)).toBeInTheDocument();
		expect(screen.getByText(/You need the Timeout Members permission to see the warnings/)).toBeInTheDocument();
		expect(screen.queryByText(/Give the bot View Audit Log/)).not.toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByText("marcus");

		await expectNoViolations(container);
	});
});

describe("putting a change back", () => {
	async function openPanel(): Promise<ReturnType<typeof userEvent.setup>> {
		const user = userEvent.setup();
		renderPage();
		await user.click(await screen.findByRole("button", { name: "Put back" }));
		return user;
	}

	/** It goes through the route that made the change, so its own gates decide, and sends only what that change altered. */
	it("shows what the setting holds now and goes back to, then sends the old values to the same route", async () => {
		let sent: unknown = null;
		server.use(
			http.patch(`/api/guilds/${GUILD}/levelling`, async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json({ ...levelConfig, enabled: false });
			}),
		);
		const user = await openPanel();

		const lines = await screen.findByRole("definition");
		expect(within(lines).getByText("Now: On")).toBeInTheDocument();
		expect(within(lines).getByText("Back to: Off")).toBeInTheDocument();
		expect(screen.getByRole("term")).toHaveTextContent("Members earn XP");

		await user.click(screen.getByRole("button", { name: "Put it back" }));

		expect(await screen.findByText("Put back. That is now the newest change in the list.")).toBeInTheDocument();
		expect(sent).toEqual({ enabled: false });
		expect(screen.queryByRole("button", { name: "Put back" })).not.toBeInTheDocument();
	});

	/** A later change, perhaps made with a command in Discord, is not undone without the reader seeing it. */
	it("refuses once the setting has been changed since, and points at its page", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/levelling`, () => HttpResponse.json({ ...levelConfig, enabled: false })));
		await openPanel();

		expect(await screen.findByText(/has been changed since/)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Open its page" })).toHaveAttribute("href", `/guilds/${GUILD}/levelling`);
		expect(screen.queryByRole("button", { name: "Put it back" })).not.toBeInTheDocument();
	});

	it("says why the route refused, beside the button", async () => {
		server.use(
			http.patch(`/api/guilds/${GUILD}/levelling`, () =>
				HttpResponse.json(
					{ error: { code: "missing_permission", message: "You need Manage Roles." } },
					{ status: 403 },
				),
			),
		);
		const user = await openPanel();

		await user.click(await screen.findByRole("button", { name: "Put it back" }));

		expect(await screen.findByText("You need Manage Roles.")).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations with the panel open", async () => {
		const user = userEvent.setup();
		const { container } = renderPage();
		await user.click(await screen.findByRole("button", { name: "Put back" }));
		await screen.findByRole("button", { name: "Put it back" });

		await expectNoViolations(container);
	});
});
