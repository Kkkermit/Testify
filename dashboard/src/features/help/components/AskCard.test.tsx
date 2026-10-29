import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AskCard } from "@/features/help/components/AskCard";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderCard() {
	return renderWithProviders(<AskCard name="Testify" />, { path: "/help", route: "/help" });
}

function box(): HTMLElement {
	return screen.getByRole("combobox", { name: "Your question" });
}

async function askQuestion(question: string): Promise<void> {
	const user = userEvent.setup();
	await user.type(box(), question);
	await user.click(screen.getByRole("button", { name: "Ask" }));
}

describe("AskCard", () => {
	/** Suggestions come from the same search the bot answers with, run in the browser on every keystroke. */
	it("suggests articles while a word is still being typed", async () => {
		renderCard();
		await screen.findByRole("list", { name: "Where most people start" });
		const user = userEvent.setup();

		await user.type(box(), "tick");

		const list = screen.getByRole("listbox", { name: "Suggestions" });
		expect(within(list).getByRole("option", { name: /Setting up tickets/ })).toBeInTheDocument();
		expect(box()).toHaveAttribute("aria-expanded", "true");
	});

	it("opens a suggestion chosen with the keyboard, and moves to it", async () => {
		renderCard();
		await screen.findByRole("list", { name: "Where most people start" });
		const user = userEvent.setup();

		await user.type(box(), "tick");
		await user.keyboard("{ArrowDown}");
		expect(box()).toHaveAttribute("aria-activedescendant");

		await user.keyboard("{Enter}");

		const heading = await screen.findByRole("heading", { level: 3, name: "Article tickets" });
		expect(heading).toHaveFocus();
	});

	it("closes the suggestions on Escape without clearing what was typed", async () => {
		renderCard();
		await screen.findByRole("list", { name: "Where most people start" });
		const user = userEvent.setup();

		await user.type(box(), "tick");
		await user.keyboard("{Escape}");

		expect(box()).toHaveAttribute("aria-expanded", "false");
		expect(box()).toHaveValue("tick");
	});

	/** A refused request has to say so beside the form, or it is indistinguishable from the click not landing. */
	it("says why a question was refused", async () => {
		server.use(
			http.post("/api/support/ask", () =>
				HttpResponse.json(
					{ error: { code: "rate_limited", message: "Too many requests. Try again in 30 seconds." } },
					{ status: 429 },
				),
			),
		);
		renderCard();
		await askQuestion("how do I set up levelling");

		expect(await screen.findByText("Too many requests. Try again in 30 seconds.")).toBeInTheDocument();
	});

	it("has no accessibility violations with suggestions open, or with an answer showing", async () => {
		const { container } = renderCard();
		await screen.findByRole("list", { name: "Where most people start" });
		const user = userEvent.setup();

		await user.type(box(), "tick");
		await expectNoViolations(container);

		await user.click(screen.getByRole("button", { name: "Ask" }));
		await screen.findByRole("article", { name: "Setting up levelling" });
		await expectNoViolations(container);
	});
});
