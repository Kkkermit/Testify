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
	it("offers the articles most people start from before anything is typed", async () => {
		renderCard();

		const list = await screen.findByRole("list", { name: "Where most people start" });
		expect(within(list).getByRole("button", { name: "Adding Testify to your server" })).toBeInTheDocument();
		expect(within(list).queryByRole("button", { name: "Setting up tickets" })).not.toBeInTheDocument();
	});

	it("will not send a question shorter than the API accepts", async () => {
		renderCard();
		const user = userEvent.setup();

		await user.type(box(), "hi");

		expect(screen.getByRole("button", { name: "Ask" })).toBeDisabled();
	});

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

	it("shows the article that answers the question, drawn from its Markdown under its topic", async () => {
		renderCard();
		await askQuestion("how do I set up levelling");

		const article = await screen.findByRole("article", { name: "Setting up levelling" });
		expect(within(article).getByText("Setting up features")).toBeInTheDocument();
		expect(within(article).getByText("/levelling setup").tagName).toBe("CODE");
		expect(within(article).getByRole("link", { name: "dashboard" })).toHaveAttribute("href", "/guilds");
		expect(within(article).getByText(/Nobody loses XP/)).toBeInTheDocument();
	});

	it("opens a related article in place", async () => {
		renderCard();
		await askQuestion("how do I set up levelling");
		const user = userEvent.setup();

		const related = await screen.findByRole("list", { name: "Related articles" });
		await user.click(within(related).getByRole("button", { name: "The bot cannot give or remove a role" }));

		expect(await screen.findByRole("heading", { level: 3, name: "Article role-order" })).toBeInTheDocument();
	});

	it("lists every article by topic, folded away until asked for", async () => {
		renderCard();
		const user = userEvent.setup();

		await user.click(await screen.findByText("Browse every article"));

		expect(screen.getByRole("heading", { level: 3, name: "Fixing problems" })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { level: 3, name: "Command reference" })).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Setting up tickets" }));
		expect(await screen.findByRole("heading", { level: 3, name: "Article tickets" })).toBeInTheDocument();
	});

	it("says what it can help with when nothing answers the question", async () => {
		server.use(http.post("/api/support/ask", () => HttpResponse.json({ answer: null, related: [] })));
		renderCard();
		await askQuestion("what is the capital of france");

		expect(await screen.findByText(/No help article answers that/)).toBeInTheDocument();
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
