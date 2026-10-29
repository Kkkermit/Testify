import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { LevellingPage } from "@/features/levelling/LevellingPage";
import { expectNoViolations } from "@/test/axe";
import { levelConfig } from "@/test/fixtures/community";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(tab?: string) {
	return renderWithProviders(<LevellingPage />, {
		path: "/guilds/:guildId/levelling",
		route: `/guilds/${GUILD}/levelling${tab === undefined ? "" : `?tab=${tab}`}`,
	});
}

function refuseWith(method: "patch" | "put", path: string, code: string, message: string): void {
	server.use(
		http[method](`/api/guilds/:guildId/levelling${path}`, () =>
			HttpResponse.json({ error: { code, message } }, { status: 403 }),
		),
	);
}

describe("the general tab", () => {
	it.each([
		["announce level-ups", "announce"],
		["rewards stack", "stackRewards"],
	])("sends only %s when that switch is used", async (label, field) => {
		const user = userEvent.setup();
		let sent: unknown;
		server.use(
			http.patch("/api/guilds/:guildId/levelling", async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json(levelConfig);
			}),
		);

		renderPage();
		await user.click(await screen.findByRole("switch", { name: new RegExp(label, "i") }));

		await waitFor(() => {
			expect(sent).toEqual({ [field]: false });
		});
	});

	/** The delay is what makes the optimism observable — without it the answer lands before the assertion. */
	it("flips immediately rather than waiting for the server", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch("/api/guilds/:guildId/levelling", async () => {
				await delay(80);
				return HttpResponse.json({ ...levelConfig, enabled: false });
			}),
		);
		renderPage();

		const toggle = await screen.findByRole("switch", { name: /members earn xp/i });
		await user.click(toggle);

		expect(toggle).not.toBeChecked();
	});

	/** A switch that stays on while the server said no is a lie, and one that flips back silently looks like a bug. */
	it("puts the switch back and says why when the server refuses", async () => {
		const user = userEvent.setup();
		refuseWith("patch", "", "missing_manage_guild", "You need Manage Server in that server.");

		renderPage();
		const toggle = await screen.findByRole("switch", { name: /members earn xp/i });

		await user.click(toggle);

		await waitFor(() => {
			expect(toggle).toBeChecked();
		});
		expect(await screen.findByText(/need manage server/i)).toBeInTheDocument();
	});

	/** `null` means "reply where they were talking" — a real choice, not an absent one. */
	it("can clear the announcement channel", async () => {
		const user = userEvent.setup();
		let sent: unknown;
		server.use(
			http.patch("/api/guilds/:guildId/levelling", async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json(levelConfig);
			}),
		);

		renderPage();
		const picker = await screen.findByLabelText(/announce level-ups in/i);
		await user.selectOptions(picker, "400000000000000001");
		await waitFor(() => {
			expect(sent).toEqual({ levelUpChannelId: "400000000000000001" });
		});

		await user.selectOptions(picker, "");
		await waitFor(() => {
			expect(sent).toEqual({ levelUpChannelId: null });
		});
	});

	/** Saving a channel Testify cannot post in is a configuration that silently does nothing. */
	it("marks a channel the bot cannot post in as unusable", async () => {
		renderPage();
		await screen.findByLabelText(/announce level-ups in/i);

		expect(screen.getByRole("option", { name: /locked/i })).toBeDisabled();
	});
});

describe("the rewards tab", () => {
	/** The bot cannot grant a role above itself, so offering one would be setting up a silent failure. */
	it("does not offer a role the bot could not hand out", async () => {
		renderPage("rewards");
		await screen.findByLabelText("Role");

		expect(screen.queryByRole("option", { name: "Admin" })).toBeNull();
		expect(await screen.findByText(/above testify/i)).toBeInTheDocument();
	});

	it("refuses to add a second reward for a level that already has one", async () => {
		renderPage("rewards");
		await screen.findByLabelText("Role");

		expect(await screen.findByText(/level 5 already has a reward/i)).toBeInTheDocument();
	});
});

describe("the boosts tab", () => {
	/** Someone with several boost roles gets the highest, not the product — three ×5 roles are not ×125. */
	it("says how several boosts combine", async () => {
		renderPage("boosts");

		expect(await screen.findByText(/highest, not the product/i)).toBeInTheDocument();
	});

	/** The list is replaced whole, so an unrelated add must not reset a multiplier somebody already chose. */
	it("keeps the existing multipliers when another role is added", async () => {
		const user = userEvent.setup();
		let sent: unknown;
		server.use(
			http.put("/api/guilds/:guildId/levelling/boosts", async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json(levelConfig);
			}),
		);

		renderPage("boosts");
		await user.selectOptions(await screen.findByLabelText(/multiplier for booster/i), "5");
		await waitFor(() => {
			expect(sent).toEqual([{ roleId: "300000000000000002", multiplier: 5 }]);
		});

		await user.click(screen.getByRole("checkbox", { name: /member/i }));

		await waitFor(() => {
			expect(sent).toEqual([
				{ roleId: "300000000000000002", multiplier: 2 },
				{ roleId: "300000000000000001", multiplier: 2 },
			]);
		});
	});

	/** Adding a sixth would be accepted by the web and then unrenderable in the Discord panel. */
	it("stops at the limit the panel can render", async () => {
		server.use(
			http.get("/api/guilds/:guildId/levelling", () =>
				HttpResponse.json({
					...levelConfig,
					boosts: Array.from({ length: 5 }, (_, index) => ({
						roleId: `50000000000000000${String(index)}`,
						multiplier: 2,
					})),
				}),
			),
		);

		renderPage("boosts");

		expect(await screen.findByText("5 of 5 chosen")).toBeInTheDocument();
		expect(screen.getByRole("checkbox", { name: /member/i })).toBeDisabled();
	});
});

describe("the ignores tab", () => {
	it("counts what is chosen against the limit", async () => {
		renderPage("ignores");

		expect(await screen.findByText(`0 of 10 chosen`)).toBeInTheDocument();
	});
});

describe("LevellingPage accessibility", () => {
	it("has no automatically detectable violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("switch", { name: /members earn xp/i });

		await expectNoViolations(container);
	});
});
