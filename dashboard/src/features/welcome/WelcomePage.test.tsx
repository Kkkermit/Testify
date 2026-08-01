import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { insertToken, messageTooLong } from "@/features/welcome/welcome.utils";
import { WelcomePage } from "@/features/welcome/WelcomePage";
import { expectNoViolations } from "@/test/axe";
import { welcomeConfig } from "@/test/handlers";
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

describe("messageTooLong", () => {
	it("accepts an ordinary greeting", () => {
		expect(messageTooLong("Welcome!")).toBe(false);
	});

	it("rejects one Discord would refuse", () => {
		expect(messageTooLong("x".repeat(1_501))).toBe(true);
	});
});

describe("the welcome page", () => {
	it("shows the greeting that is configured", async () => {
		renderPage();

		expect(await screen.findByRole("switch", { name: /greet new members/i })).toBeChecked();
		expect(screen.getByRole("radio", { name: /image card/i })).toBeChecked();
	});

	it("sends only the field that changed", async () => {
		const user = userEvent.setup();
		const captured = capturePatch();

		renderPage();
		await user.click(await screen.findByRole("switch", { name: /greet new members/i }));

		await waitFor(() => {
			expect(captured.body).toEqual({ enabled: false });
		});
	});

	it("changes the style", async () => {
		const user = userEvent.setup();
		const captured = capturePatch();

		renderPage();
		await user.click(await screen.findByRole("radio", { name: /embed/i }));

		await waitFor(() => {
			expect(captured.body).toEqual({ style: "embed" });
		});
	});

	/** A greeting nobody can see is the failure this screen exists to prevent. */
	it("marks a channel the bot cannot post in as unusable", async () => {
		renderPage();
		await screen.findByLabelText(/send the greeting to/i);

		expect(screen.getByRole("option", { name: /locked/i })).toBeDisabled();
	});

	it("fills the placeholders in the preview rather than showing the raw template", async () => {
		renderPage();

		const preview = await screen.findByRole("region", { name: "Preview" });

		expect(within(preview).getByText(/@newcomer/)).toBeInTheDocument();
		expect(within(preview).queryByText(/\{user\}/)).toBeNull();
	});

	it("inserts a placeholder at the caret when its chip is used", async () => {
		const user = userEvent.setup();
		renderPage();

		const box = await screen.findByLabelText("Message");
		await user.clear(box);
		await user.type(box, "Hi ");
		await user.click(screen.getByRole("button", { name: "{username}" }));

		expect(box).toHaveValue("Hi {username}");
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

	it("can discard an edit and go back to what is saved", async () => {
		const user = userEvent.setup();
		renderPage();

		const box = await screen.findByLabelText("Message");
		await user.type(box, " and hello");
		await user.click(screen.getByRole("button", { name: /discard/i }));

		expect(box).toHaveValue(welcomeConfig.message);
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
});

describe("WelcomePage accessibility", () => {
	it("has no automatically detectable violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("switch", { name: /greet new members/i });

		await expectNoViolations(container);
	});
});
