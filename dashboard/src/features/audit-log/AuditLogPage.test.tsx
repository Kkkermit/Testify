import { AUDIT_EVENTS, type AuditLogPut } from "@testify/shared";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AuditLogPage } from "@/features/audit-log/AuditLogPage";
import { expectNoViolations } from "@/test/axe";
import { auditLogConfig } from "@/test/handlers";
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

describe("the audit log page", () => {
	it("shows what is configured", async () => {
		renderPage();

		expect(await screen.findByRole("switch", { name: /record server events/i })).toBeChecked();
		expect(screen.getByRole("checkbox", { name: /message deleted/i })).toBeChecked();
		expect(screen.getByRole("checkbox", { name: /message edited/i })).not.toBeChecked();
	});

	/**
	 * A channel and a set of events are one decision, so nothing may be written until Save — the mistake this
	 * pins is a control that saves per click and leaves half a configuration applied.
	 */
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

	it("has nothing to save until something changes", async () => {
		const user = userEvent.setup();
		renderPage();

		expect(await screen.findByRole("switch", { name: /record server events/i })).toBeChecked();
		expect(save()).toBeDisabled();

		await user.click(screen.getByRole("checkbox", { name: /message edited/i }));

		expect(save()).toBeEnabled();
	});

	it("puts the saved configuration back when the edits are discarded", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(await screen.findByRole("checkbox", { name: /message edited/i }));
		await user.click(screen.getByRole("button", { name: /discard/i }));

		expect(screen.getByRole("checkbox", { name: /message edited/i })).not.toBeChecked();
		expect(save()).toBeDisabled();
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

	it("counts what is chosen", async () => {
		const user = userEvent.setup();
		renderPage();

		expect(await screen.findByText(`2 of ${String(AUDIT_EVENTS.length)} chosen`)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /select all/i }));

		expect(screen.getByText(`${String(AUDIT_EVENTS.length)} of ${String(AUDIT_EVENTS.length)} chosen`)).toBeVisible();
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

	/** Turning it off deletes the record, so it must not be held back by the empty-selection rule. */
	it("allows turning logging off with nothing selected", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(await screen.findByRole("button", { name: /select all/i }));
		await user.click(screen.getByRole("button", { name: /clear all/i }));
		await user.click(screen.getByRole("switch", { name: /record server events/i }));

		expect(save()).toBeEnabled();
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
