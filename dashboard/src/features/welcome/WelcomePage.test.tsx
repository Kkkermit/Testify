import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { insertToken } from "@/features/welcome/welcome.utils";
import { WelcomePage } from "@/features/welcome/WelcomePage";
import { expectNoViolations } from "@/test/axe";
import { goodbyeConfig, welcomeConfig } from "@/test/fixtures/community";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage() {
	return renderWithProviders(<WelcomePage />, {
		path: "/guilds/:guildId/welcome",
		route: `/guilds/${GUILD}/welcome`,
	});
}

function capturePatch(): { body: unknown } {
	const captured: { body: unknown } = { body: undefined };
	server.use(
		http.patch("/api/guilds/:guildId/welcome", async ({ request }) => {
			captured.body = await request.json();
			return HttpResponse.json(welcomeConfig);
		}),
	);
	return captured;
}

describe("insertToken", () => {
	it("inserts at the caret", () => {
		expect(insertToken("Hello  there", "{user}", 6)).toBe("Hello {user} there");
	});

	/** A blurred textarea reports no caret, and dropping the token entirely would look broken. */
	it("appends when there is no caret", () => {
		expect(insertToken("Hello", "{user}", null)).toBe("Hello{user}");
	});

	it("appends rather than corrupting the message when the caret is out of range", () => {
		expect(insertToken("Hi", "{user}", 99)).toBe("Hi{user}");
	});
});

describe("the welcome page", () => {
	/** A greeting nobody can see is the failure this screen exists to prevent. */
	it("marks a channel the bot cannot post in as unusable", async () => {
		renderPage();
		const greeting = await screen.findByRole("region", { name: "Greeting" });

		expect(within(greeting).getByRole("option", { name: /locked/i })).toBeDisabled();
	});

	/** The preview renders Discord's marks rather than showing the asterisks. */
	it("renders Discord's marks rather than showing the asterisks", async () => {
		renderPage();

		const preview = await screen.findByRole("region", { name: "Preview" });

		expect(within(preview).getByText("Test Server")).toHaveClass("font-bold");
		expect(preview.textContent).not.toContain("**");
	});

	/** The template is the one field that is typed, so it must not save on every keystroke. */
	it("saves the message only once it is committed", async () => {
		const user = userEvent.setup();
		const captured = capturePatch();

		renderPage();
		const box = await screen.findByLabelText("Message");
		await user.clear(box);
		await user.type(box, "Hello!");

		expect(captured.body).toBeUndefined();

		await user.click(screen.getByRole("button", { name: /save message/i }));

		await waitFor(() => {
			expect(captured.body).toEqual({ message: "Hello!" });
		});
	});

	it("refuses to save a message longer than Discord accepts", async () => {
		const user = userEvent.setup();
		renderPage();

		const box = await screen.findByLabelText("Message");
		await user.clear(box);
		// Pasting rather than typing, or the test spends a second and a half on keystrokes.
		await user.click(box);
		await user.paste("x".repeat(1_501));

		expect(await screen.findByText(/longer than Discord will accept/i)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /save message/i })).toBeNull();
	});

	/** A switch that stays on while the server said no is a lie; one that flips back must say why. */
	it("puts the switch back and says why when the server refuses", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch("/api/guilds/:guildId/welcome", async () => {
				await delay(20);
				return HttpResponse.json(
					{ error: { code: "missing_manage_guild", message: "You need Manage Server in that server." } },
					{ status: 403 },
				);
			}),
		);

		renderPage();
		const toggle = await screen.findByRole("switch", { name: /greet new members/i });
		await user.click(toggle);

		await waitFor(() => {
			expect(toggle).toBeChecked();
		});
		expect(await screen.findByText(/need manage server/i)).toBeInTheDocument();
	});

	/** Every control the API would refuse without a channel is disabled instead, or the page hands out 400s nobody expected. */
	it("gates everything on the channel, rather than letting the API refuse it", async () => {
		server.use(
			http.get("/api/guilds/:guildId/welcome", () =>
				HttpResponse.json({ ...welcomeConfig, channelId: null, enabled: false }),
			),
		);

		renderPage();

		expect(await screen.findByRole("switch", { name: /greet new members/i })).toBeDisabled();
		expect(screen.getByRole("radio", { name: /card/i })).toBeDisabled();
		expect(screen.getByLabelText("Message")).toBeDisabled();
		expect(screen.getByText(/pick a channel and the rest of this page turns on/i)).toBeInTheDocument();
	});
});

describe("the goodbye card", () => {
	function captureGoodbye(): { body: unknown } {
		const captured: { body: unknown } = { body: undefined };
		server.use(
			http.patch("/api/guilds/:guildId/goodbye", async ({ request }) => {
				captured.body = await request.json();
				return HttpResponse.json(goodbyeConfig);
			}),
		);
		return captured;
	}

	const card = () => screen.findByRole("region", { name: "Goodbye" });

	/** Two "Sent as" groups on one page must not share a radio name, or choosing one clears the other. */
	it("keeps its style apart from the greeting's", async () => {
		const user = userEvent.setup();
		const captured = captureGoodbye();

		renderPage();
		await user.click(within(await card()).getByRole("radio", { name: /embed/i }));

		await waitFor(() => {
			expect(captured.body).toEqual({ style: "embed" });
		});
		expect(
			within(screen.getByRole("region", { name: "Greeting" })).getByRole("radio", { name: /image card/i }),
		).toBeChecked();
	});

	/** The bot refuses to switch on with no channel, so the page disables it rather than collecting a 400. */
	it("gates everything on the channel", async () => {
		server.use(
			http.get("/api/guilds/:guildId/goodbye", () =>
				HttpResponse.json({ ...goodbyeConfig, channelId: null, enabled: false }),
			),
		);

		renderPage();
		const goodbye = await card();

		expect(within(goodbye).getByRole("switch", { name: /say goodbye/i })).toBeDisabled();
		expect(within(goodbye).getByLabelText("Goodbye message")).toBeDisabled();
		expect(within(goodbye).getByText(/rest of this card turns on/i)).toBeInTheDocument();
	});

	/** A goodbye that would never arrive has to say so, or the switch reads as working. */
	it("warns when the bot cannot post in the channel", async () => {
		server.use(http.get("/api/guilds/:guildId/goodbye", () => HttpResponse.json({ ...goodbyeConfig, canSend: false })));

		renderPage();

		expect(within(await card()).getByText(/can’t post in that channel/i)).toBeInTheDocument();
	});

	it("says why when the server refuses", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch("/api/guilds/:guildId/goodbye", () =>
				HttpResponse.json(
					{ error: { code: "bad_request", message: "Pick a channel for the goodbye first." } },
					{ status: 400 },
				),
			),
		);

		renderPage();
		const goodbye = await card();
		await user.click(within(goodbye).getByRole("switch", { name: /say goodbye/i }));

		expect(await within(goodbye).findByText(/pick a channel for the goodbye first/i)).toBeInTheDocument();
		expect(within(goodbye).getByRole("switch", { name: /say goodbye/i })).toBeChecked();
	});

	/** It reads on its own, so a failure here must leave the greeting usable. */
	it("fails on its own, leaving the greeting working", async () => {
		server.use(http.get("/api/guilds/:guildId/goodbye", () => HttpResponse.json({}, { status: 500 })));

		renderPage();

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
		expect(screen.getByRole("switch", { name: /greet new members/i })).toBeEnabled();
	});
});

describe("WelcomePage accessibility", () => {
	it("has no automatically detectable violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("switch", { name: /greet new members/i });
		await screen.findByRole("switch", { name: /say goodbye/i });

		await expectNoViolations(container);
	});
});
