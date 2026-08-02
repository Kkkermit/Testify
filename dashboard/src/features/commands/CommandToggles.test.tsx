import { type CommandTogglePut } from "@testify/shared";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { CommandsPage } from "@/features/commands/CommandsPage";
import { commandToggles } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function inGuild() {
	return renderWithProviders(<CommandsPage />, {
		path: "/guilds/:guildId/commands",
		route: `/guilds/${GUILD}/commands`,
	});
}

function capturePut(path: string): { body: unknown } {
	const captured: { body: unknown } = { body: undefined };
	server.use(
		http.put(path, async ({ request }) => {
			captured.body = await request.json();
			return HttpResponse.json(commandToggles);
		}),
	);
	return captured;
}

describe("switching commands off in a server", () => {
	it("shows a switch per command", async () => {
		inGuild();

		expect(await screen.findByRole("switch", { name: "/ban" })).toBeInTheDocument();
		expect(screen.getByRole("switch", { name: "/levelling" })).toBeInTheDocument();
	});

	it("shows what is already off", async () => {
		inGuild();

		expect(await screen.findByRole("switch", { name: "/ban" })).not.toBeChecked();
		expect(screen.getByRole("switch", { name: "/levelling" })).toBeChecked();
	});

	/** The control is a set of switches whose value is the list, so one request replaces the whole thing. */
	it("sends the whole list when one is flipped", async () => {
		const user = userEvent.setup();
		const captured = capturePut("/api/guilds/:guildId/commands");

		inGuild();
		await user.click(await screen.findByRole("switch", { name: "/levelling" }));

		await waitFor(() => {
			expect(captured.body).toBeDefined();
		});
		expect((captured.body as CommandTogglePut).disabled).toEqual(["ban", "levelling"]);
	});

	it("says how many are off", async () => {
		inGuild();

		expect(await screen.findByText(/1 switched off here/i)).toBeInTheDocument();
	});

	/**
	 * The switch is disabled rather than absent, and the reason is on the control — a switch that silently
	 * does nothing is the thing this avoids.
	 */
	it("locks a command the bot needs, rather than letting the request be refused", async () => {
		server.use(
			http.get("/api/commands", () =>
				HttpResponse.json({
					prefix: "t?",
					categories: ["info"],
					commands: [
						{
							name: "help",
							description: "Lists the commands.",
							category: "info",
							aliases: [],
							subcommands: [],
							options: [],
							permissions: [],
							botPermissions: [],
							cooldownMs: null,
							guildOnly: false,
							ownerOnly: false,
							nsfw: false,
						},
					],
				}),
			),
		);

		inGuild();

		expect(await screen.findByRole("switch", { name: "/help" })).toBeDisabled();
	});

	/** A server cannot re-enable what the owner switched off, so the switch must not pretend otherwise. */
	it("locks a command the owner switched off everywhere", async () => {
		server.use(
			http.get("/api/guilds/:guildId/commands", () =>
				HttpResponse.json({ disabled: [], disabledGlobally: ["ban"], locked: ["help"] }),
			),
		);

		inGuild();

		expect(await screen.findByRole("switch", { name: "/ban" })).toBeDisabled();
	});

	/** Outside a server there is no list to edit, so no switch may appear at all. */
	it("shows no switches on the bot-wide command list for a manager", async () => {
		renderWithProviders(<CommandsPage />, { path: "/commands" });
		await screen.findByText("Bans a member.");

		expect(screen.queryByRole("switch")).toBeNull();
	});
});

describe("switching commands off everywhere", () => {
	it("writes to the owner scope rather than a guild's", async () => {
		const user = userEvent.setup();
		const captured = capturePut("/api/owner/commands");

		renderWithProviders(<CommandsPage scope="global" />, { path: "/owner" });
		await user.click(await screen.findByRole("switch", { name: "/levelling" }));

		await waitFor(() => {
			expect(captured.body).toBeDefined();
		});
	});

	it("says the switch reaches every server", async () => {
		renderWithProviders(<CommandsPage scope="global" />, { path: "/owner" });

		expect(await screen.findByText(/off in every server/i)).toBeInTheDocument();
	});
});
