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

async function askQuestion(question: string): Promise<void> {
	const user = userEvent.setup();
	await user.type(screen.getByRole("textbox", { name: "Your question" }), question);
	await user.click(screen.getByRole("button", { name: "Ask" }));
}

describe("AskCard", () => {
	it("offers the articles most people start from before anything is asked", async () => {
		renderCard();

		const list = await screen.findByRole("list", { name: "Where most people start" });
		expect(within(list).getByRole("button", { name: "Adding Testify to your server" })).toBeInTheDocument();
	});

	it("will not send a question shorter than the API accepts", async () => {
		renderCard();
		const user = userEvent.setup();

		await user.type(screen.getByRole("textbox", { name: "Your question" }), "hi");

		expect(screen.getByRole("button", { name: "Ask" })).toBeDisabled();
	});

	it("shows the article that answers the question, drawn from its Markdown", async () => {
		renderCard();
		await askQuestion("how do I set up levelling");

		expect(await screen.findByRole("heading", { level: 3, name: "Setting up levelling" })).toBeInTheDocument();
		expect(screen.getByText("/levelling setup").tagName).toBe("CODE");
		expect(screen.getByRole("link", { name: "dashboard" })).toHaveAttribute("href", "/guilds");
		expect(screen.getByRole("button", { name: "The bot cannot give or remove a role" })).toBeInTheDocument();
	});

	it("opens a related article in place", async () => {
		renderCard();
		await askQuestion("how do I set up levelling");
		const user = userEvent.setup();

		await user.click(await screen.findByRole("button", { name: "The bot cannot give or remove a role" }));

		expect(await screen.findByRole("heading", { level: 3, name: "Article role-order" })).toBeInTheDocument();
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

	it("has no accessibility violations with an answer showing", async () => {
		const { container } = renderCard();
		await askQuestion("how do I set up levelling");
		await screen.findByRole("heading", { level: 3 });

		await expectNoViolations(container);
	});
});
