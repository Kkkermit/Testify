import { type AuditLogPut } from "@testify/shared";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AuditLogPage } from "@/features/audit-log/AuditLogPage";
import { expectNoViolations } from "@/test/axe";
import { auditLogConfig } from "@/test/fixtures/moderation";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage() {
	return renderWithProviders(<AuditLogPage />, {
		path: "/guilds/:guildId/audit-log",
		route: `/guilds/${GUILD}/audit-log`,
	});
}

function capturePut(): { body: unknown } {
	const captured: { body: unknown } = { body: undefined };
	server.use(
		http.put("/api/guilds/:guildId/audit-log", async ({ request }) => {
			captured.body = await request.json();
			return HttpResponse.json(auditLogConfig);
		}),
	);
	return captured;
}

function save(): HTMLElement {
	return screen.getByRole("button", { name: /save changes/i });
}

/** True when the page would have the browser ask before a reload or a closed tab. */
function asksBeforeUnload(): boolean {
	const event = new Event("beforeunload", { cancelable: true });
	window.dispatchEvent(event);
	return event.defaultPrevented;
}

describe("the audit log page", () => {
	/** Nothing is written until Save, or half a configuration ends up applied. */
	it("writes nothing until Save is pressed", async () => {
		const user = userEvent.setup();
		const captured = capturePut();

		renderPage();
		await user.click(await screen.findByRole("checkbox", { name: /message edited/i }));

		expect(captured.body).toBeUndefined();

		await user.click(save());

		await waitFor(() => {
			expect(captured.body).toBeDefined();
		});

		const sent = captured.body as AuditLogPut;
		expect(sent.enabled).toBe(true);
		expect(sent.events).toContain("messageUpdate");
	});

	/** The draft is held until Save, so leaving with it unsaved has to be asked about. */
	it("asks before leaving with changes unsaved, and not once they are discarded", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(await screen.findByRole("checkbox", { name: /message edited/i }));
		expect(asksBeforeUnload()).toBe(true);

		await user.click(screen.getByRole("button", { name: /discard/i }));
		expect(asksBeforeUnload()).toBe(false);
	});

	/** One checkbox per part of the server, so eighteen events are five decisions rather than eighteen. */
	it("ticks a whole group at once", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(await screen.findByRole("checkbox", { name: "Roles" }));

		expect(screen.getByRole("checkbox", { name: /role created/i })).toBeChecked();
		expect(screen.getByRole("checkbox", { name: /role deleted/i })).toBeChecked();
		expect(screen.getByRole("checkbox", { name: /message deleted/i })).toBeChecked();
	});

	/** The `all` shorthand is the difference between logging future events and being frozen at today's list. */
	it("says that a full selection covers events added later", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(await screen.findByRole("button", { name: /select all/i }));

		expect(screen.getByText(/added in a future update/i)).toBeInTheDocument();
	});

	it("refuses to save a log that would record nothing", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(await screen.findByRole("button", { name: /select all/i }));
		await user.click(screen.getByRole("button", { name: /clear all/i }));

		expect(await screen.findByText(/at least one event/i)).toBeInTheDocument();
		expect(save()).toBeDisabled();
	});

	it("explains a refusal from the API rather than silently doing nothing", async () => {
		const user = userEvent.setup();
		server.use(
			http.put("/api/guilds/:guildId/audit-log", () =>
				HttpResponse.json({ error: { code: "bad_request", message: "Choose a channel first." } }, { status: 400 }),
			),
		);

		renderPage();
		await user.click(await screen.findByRole("checkbox", { name: /message edited/i }));
		await user.click(save());

		expect(await screen.findByText("Choose a channel first.")).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("switch", { name: /record server events/i });

		await expectNoViolations(container);
	});
});
