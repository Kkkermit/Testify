import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { countCapProblem, countProgress, prefixProblem } from "@/features/settings/settings.utils";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { expectNoViolations } from "@/test/axe";
import { t } from "@/test/english";
import { serverSettings } from "@/test/fixtures/server";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage() {
	return renderWithProviders(<SettingsPage />, {
		path: "/guilds/:guildId/settings",
		route: `/guilds/${GUILD}/settings`,
	});
}

/** Records what each section sends, so a test can assert on one endpoint without stubbing the rest. */
function capture(section: string, method: "patch" | "put" = "patch"): { body: unknown } {
	const captured: { body: unknown } = { body: undefined };
	const handler = method === "put" ? http.put : http.patch;

	server.use(
		handler(`/api/guilds/:guildId/settings/${section}`, async ({ request }) => {
			captured.body = await request.json();
			return HttpResponse.json(serverSettings);
		}),
	);

	return captured;
}

describe("prefixProblem", () => {
	/** All three rules the API enforces, so the form refuses before the request rather than after it. */
	it("refuses one that cannot be typed or would match everything", () => {
		expect(prefixProblem("", t)).toMatch(/empty/i);
		expect(prefixProblem("   ", t)).toMatch(/empty/i);
		expect(prefixProblem("a b", t)).toMatch(/space/i);
		expect(prefixProblem("waytoolongprefix", t)).toMatch(/longer/i);
	});

	/** A `/` prefix would put every command next to Discord's own picker. */
	it("refuses one that collides with slash commands", () => {
		expect(prefixProblem("/", t)).toMatch(/collides/i);
	});
});

describe("countCapProblem", () => {
	it("refuses anything that is not one", () => {
		for (const value of ["", "0", "-5", "1.5", "abc", "2000000"]) expect(countCapProblem(value, t)).not.toBeNull();
	});
});

describe("countProgress", () => {
	/** A count past its target must not overflow the bar, and a zero target must not divide by zero. */
	it("survives a degenerate target", () => {
		expect(countProgress(200, 100)).toBe(100);
		expect(countProgress(5, 0)).toBe(0);
	});
});

describe("the settings page", () => {
	/**
	 * The sections are grouped, and each folds away alone; jsdom renders a closed `<details>`, so this pins the state.
	 */
	it("groups the sections, and folds one away without touching the rest", async () => {
		const user = userEvent.setup();
		renderPage();

		const groupOf = (label: string): Element | null => screen.getByText(label).closest("details");

		expect(await screen.findByText("Joining")).toBeInTheDocument();
		for (const label of ["Testify in this server", "Joining", "Moderation", "Channels"]) {
			expect(groupOf(label)).toHaveAttribute("open");
		}

		await user.click(screen.getByText("Channels"));

		expect(groupOf("Channels")).not.toHaveAttribute("open");
		expect(groupOf("Testify in this server")).toHaveAttribute("open");
		expect(screen.getByRole("heading", { name: "Command prefix" })).toBeInTheDocument();
	});

	/** Each section is its own endpoint, so a toggle must not send the whole document. */
	it("sends only the field a toggle changed", async () => {
		const user = userEvent.setup();
		const captured = capture("prefix");

		renderPage();
		await user.click(await screen.findByRole("switch", { name: /allow prefix commands/i }));

		await waitFor(() => {
			expect(captured.body).toEqual({ enabled: false });
		});
	});

	it("refuses to send a prefix the bot would reject", async () => {
		const user = userEvent.setup();
		const captured = capture("prefix");

		renderPage();
		const field = await screen.findByLabelText("Prefix");
		await user.clear(field);
		await user.type(field, "a b");
		await user.tab();

		expect(await screen.findByText(/cannot contain a space/i)).toBeInTheDocument();
		expect(captured.body).toBeUndefined();
	});

	/** The count is a channel name, so a text channel is not a thing it can be shown in. */
	it("offers only voice channels for the member counts", async () => {
		renderPage();

		const picker = await screen.findByLabelText("Members");

		expect(picker).toHaveDisplayValue("Not shown");
		expect(screen.getAllByRole("option", { name: "Voice" })).toHaveLength(2);
		expect(screen.queryByRole("option", { name: "general" })).toBeNull();
	});

	/** A refused section write is explained beside the control that caused it. */
	it("explains a refusal from the API, beside the control that caused it", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch("/api/guilds/:guildId/settings/counting", () =>
				HttpResponse.json({ error: { code: "bad_request", message: "Choose a channel first." } }, { status: 400 }),
			),
		);

		renderPage();
		await user.click(await screen.findByRole("switch", { name: /run a counting channel/i }));

		const warning = await screen.findByText("Choose a channel first.");

		expect(warning).toBeInTheDocument();
		// Beside its own control, not at the top of the page: the reader may never have scrolled past it.
		expect(warning.closest("section, div")).toContainElement(
			screen.getByRole("switch", { name: /run a counting channel/i }),
		);
	});

	/** One section refusing must not put a warning on the six that saved fine. */
	it("keeps a refusal inside the section it came from", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch("/api/guilds/:guildId/settings/counting", () =>
				HttpResponse.json({ error: { code: "bad_request", message: "Choose a channel first." } }, { status: 400 }),
			),
		);

		renderPage();
		await user.click(await screen.findByRole("switch", { name: /run a counting channel/i }));
		await screen.findByText("Choose a channel first.");

		expect(screen.getAllByText("Choose a channel first.")).toHaveLength(1);
	});

	/** A slow write carries a snapshot taken before a later one, so landing it on the cache would put the other section's control back. */
	it("does not let one section's slow answer undo another's", async () => {
		const user = userEvent.setup();
		let stored = serverSettings;
		let release = (): void => undefined;
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});

		server.use(
			http.get("/api/guilds/:guildId/settings", () => HttpResponse.json(stored)),
			http.patch("/api/guilds/:guildId/settings/prefix", async ({ request }) => {
				const patch = (await request.json()) as { enabled: boolean };
				const answer = { ...stored, prefix: { ...stored.prefix, ...patch } };
				stored = answer;
				await held;
				return HttpResponse.json(answer);
			}),
			http.patch("/api/guilds/:guildId/settings/counting", async ({ request }) => {
				const patch = (await request.json()) as { enabled: boolean };
				stored = { ...stored, counting: { ...stored.counting, ...patch } };
				return HttpResponse.json(stored);
			}),
		);

		const { client } = renderPage();
		await user.click(await screen.findByRole("switch", { name: /allow prefix commands/i }));
		await user.click(screen.getByRole("switch", { name: /run a counting channel/i }));
		release();

		await waitFor(() => {
			expect(client.isMutating()).toBe(0);
		});
		await waitFor(() => {
			expect(client.isFetching()).toBe(0);
		});

		expect(screen.getByRole("switch", { name: /run a counting channel/i })).not.toBeChecked();
		expect(screen.getByRole("switch", { name: /allow prefix commands/i })).not.toBeChecked();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { name: "Command prefix" });

		await expectNoViolations(container);
	});
});
