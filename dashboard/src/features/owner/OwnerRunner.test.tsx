import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { expectNoViolations } from "@/test/axe";
import { runResult } from "@/test/fixtures/owner";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderTab(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<OwnerPage />, { path: "/owner", route: "/owner?tab=run" });
}

describe("the command runner", () => {
	/** A command that is nothing but subcommands has no body to run, so the button waits for one. */
	it("asks which part to run before offering the button", async () => {
		renderTab();
		await userEvent.selectOptions(await screen.findByLabelText("Command"), "bot");

		expect(screen.getByRole("button", { name: /Run it/ })).toBeDisabled();

		await userEvent.selectOptions(screen.getByLabelText("Part"), "uptime");
		expect(screen.getByRole("button", { name: /Run it/ })).toBeEnabled();
	});

	/** The form is generated from the command's own metadata, so a declared option becomes a field for free. */
	it("builds a field per declared option, and a select for one with choices", async () => {
		renderTab();
		await userEvent.selectOptions(await screen.findByLabelText("Command"), "role-info");

		expect(screen.getByLabelText(/^role/)).toBeInTheDocument();
		expect(screen.getByLabelText(/detail \(optional\)/)).toHaveRole("combobox");
	});

	it("says so when the API refuses", async () => {
		server.use(
			http.post("/api/owner/runner/:name", () =>
				HttpResponse.json(
					{ error: { code: "bad_request", message: "`/ping` is switched off everywhere." } },
					{ status: 400 },
				),
			),
		);
		renderTab();

		await userEvent.selectOptions(await screen.findByLabelText("Command"), "ping");
		await userEvent.click(screen.getByRole("button", { name: /Run it/ }));

		expect(await screen.findByText("`/ping` is switched off everywhere.")).toBeInTheDocument();
	});

	describe("what it shows back", () => {
		it("draws an embed as a card with its fields", async () => {
			server.use(
				http.post("/api/owner/runner/:name", () =>
					HttpResponse.json({
						...runResult,
						outputs: [
							{
								kind: "embed",
								title: "Servers",
								description: "Three of them",
								colour: 0x7c3aed,
								fields: [{ name: "Members", value: "4,200", inline: true }],
								footer: "Testify",
							},
						],
					}),
				),
			);
			renderTab();

			await userEvent.selectOptions(await screen.findByLabelText("Command"), "ping");
			await userEvent.click(screen.getByRole("button", { name: /Run it/ }));

			expect(await screen.findByText("Servers")).toBeInTheDocument();
			expect(screen.getByText("Members")).toBeInTheDocument();
			expect(screen.getByText("4,200")).toBeInTheDocument();
		});

		/** A reply's buttons cannot work here, so the result says they were there. */
		it("names what could not cross the gap rather than hiding it", async () => {
			server.use(
				http.post("/api/owner/runner/:name", () =>
					HttpResponse.json({
						...runResult,
						outputs: [
							{ kind: "text", content: "Pick one" },
							{ kind: "dropped", what: "buttons" },
						],
						degraded: true,
					}),
				),
			);
			renderTab();

			await userEvent.selectOptions(await screen.findByLabelText("Command"), "ping");
			await userEvent.click(screen.getByRole("button", { name: /Run it/ }));

			// The block names what was dropped; the warning below it is the summary. Both are meant to be there.
			expect(await screen.findByText(/also carried buttons/)).toBeInTheDocument();
			expect(screen.getByText(/Run it there to use the controls/)).toBeInTheDocument();
		});
	});

	it("has no accessibility violations", async () => {
		const { container } = renderTab();
		await screen.findByLabelText("Command");

		await expectNoViolations(container);
	});
});
