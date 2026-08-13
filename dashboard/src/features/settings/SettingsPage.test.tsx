import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { countCapProblem, countProgress, prefixProblem } from "@/features/settings/settings.utils";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { expectNoViolations } from "@/test/axe";
import { serverSettings } from "@/test/handlers";
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
	it("accepts an ordinary prefix", () => {
		expect(prefixProblem("t?")).toBeNull();
		expect(prefixProblem("!!")).toBeNull();
	});

	/** All three rules the API enforces, so the form refuses before the request rather than after it. */
	it("refuses one that cannot be typed or would match everything", () => {
		expect(prefixProblem("")).toMatch(/empty/i);
		expect(prefixProblem("   ")).toMatch(/empty/i);
		expect(prefixProblem("a b")).toMatch(/space/i);
		expect(prefixProblem("waytoolongprefix")).toMatch(/longer/i);
	});

	/** A `/` prefix would put every command next to Discord's own picker. */
	it("refuses one that collides with slash commands", () => {
		expect(prefixProblem("/")).toMatch(/collides/i);
	});
});

describe("countCapProblem", () => {
	it("accepts a whole number in range", () => {
		expect(countCapProblem("100")).toBeNull();
	});

	it("refuses anything that is not one", () => {
		for (const value of ["", "0", "-5", "1.5", "abc", "2000000"]) expect(countCapProblem(value)).not.toBeNull();
	});
});

describe("countProgress", () => {
	it("reads as a percentage of the target", () => {
		expect(countProgress(50, 100)).toBe(50);
	});

	/** A count past its target must not overflow the bar, and a zero target must not divide by zero. */
	it("survives a degenerate target", () => {
		expect(countProgress(200, 100)).toBe(100);
		expect(countProgress(5, 0)).toBe(0);
	});
});

describe("the settings page", () => {
	it("shows every section", async () => {
		renderPage();

		expect(await screen.findByRole("heading", { name: "Command prefix" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Link filtering" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Roles on join" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Counting" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Member count channels" })).toBeInTheDocument();
	});

	/**
	 * Seven flat cards was more than one glance takes, so they are grouped by the question each answers. jsdom
	 * renders a closed `<details>` in full, so this pins the state rather than the visibility.
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

	it("shows what is configured", async () => {
		renderPage();

		expect(await screen.findByLabelText("Prefix")).toHaveValue("t?");
		expect(screen.getByRole("switch", { name: /allow prefix commands/i })).toBeChecked();
		expect(screen.getByRole("switch", { name: /delete links/i })).not.toBeChecked();
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

	it("saves the prefix on blur rather than per keystroke", async () => {
		const user = userEvent.setup();
		const captured = capture("prefix");

		renderPage();
		const field = await screen.findByLabelText("Prefix");
		await user.clear(field);
		await user.type(field, "!");

		expect(captured.body).toBeUndefined();

		await user.tab();

		await waitFor(() => {
			expect(captured.body).toEqual({ prefix: "!" });
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

	it("sends the whole role list, because the control is the list", async () => {
		const user = userEvent.setup();
		const captured = capture("auto-roles", "put");

		renderPage();
		await user.click(await screen.findByRole("checkbox", { name: /booster/i }));

		await waitFor(() => {
			expect(captured.body).toEqual({ roleIds: ["300000000000000001", "300000000000000002"] });
		});
	});

	it("shows how far through the count the server is", async () => {
		renderPage();

		expect(await screen.findByText("412")).toBeInTheDocument();
	});

	it("resets the count on its own, without touching the target", async () => {
		const user = userEvent.setup();
		const captured = capture("counting");

		renderPage();
		await user.click(await screen.findByRole("button", { name: /reset to zero/i }));

		await waitFor(() => {
			expect(captured.body).toEqual({ reset: true });
		});
	});

	/** The count is a channel name, so a text channel is not a thing it can be shown in. */
	it("offers only voice channels for the member counts", async () => {
		renderPage();

		const picker = await screen.findByLabelText("Members");

		expect(picker).toHaveDisplayValue("Not shown");
		expect(screen.getAllByRole("option", { name: "Voice" })).toHaveLength(2);
		expect(screen.queryByRole("option", { name: "general" })).toBeNull();
	});

	/**
	 * This asserted only that the switch was still on the page, which passes with no error handling at all — and
	 * it did, for as long as a refused section write said nothing a reader could see.
	 */
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
