import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { expectNoViolations } from "@/test/axe";
import { runResult } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderTab(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<OwnerPage />, { path: "/owner", route: "/owner?tab=run" });
}

function captureRun(): { body: Record<string, unknown> | null; name: string | null } {
	const captured: { body: Record<string, unknown> | null; name: string | null } = { body: null, name: null };
	server.use(
		http.post("/api/owner/runner/:name", async ({ request, params }) => {
			captured.name = params.name as string;
			captured.body = (await request.json()) as Record<string, unknown>;
			return HttpResponse.json(runResult);
		}),
	);
	return captured;
}

describe("the command runner", () => {
	it("offers only the commands the API said may be run", async () => {
		renderTab();

		const picker = await screen.findByLabelText("Command");
		expect(picker).toHaveTextContent("/ping");
		expect(picker).not.toHaveTextContent("/ban");
	});

	it("will not run before a command is picked", async () => {
		renderTab();

		expect(await screen.findByRole("button", { name: /Run it/ })).toBeDisabled();
	});

	it("runs the one that was picked and shows what it replied", async () => {
		const captured = captureRun();
		renderTab();

		await userEvent.selectOptions(await screen.findByLabelText("Command"), "ping");
		await userEvent.click(screen.getByRole("button", { name: /Run it/ }));

		await waitFor(() => {
			expect(captured.name).toBe("ping");
		});
		expect(await screen.findByText("Pong! 42ms")).toBeInTheDocument();
	});

	/** A command that is nothing but subcommands has no body to run, so the button waits for one. */
	it("asks which part to run before offering the button", async () => {
		renderTab();
		await userEvent.selectOptions(await screen.findByLabelText("Command"), "bot");

		expect(screen.getByRole("button", { name: /Run it/ })).toBeDisabled();

		await userEvent.selectOptions(screen.getByLabelText("Part"), "uptime");
		expect(screen.getByRole("button", { name: /Run it/ })).toBeEnabled();
	});

	it("sends the subcommand that was chosen", async () => {
		const captured = captureRun();
		renderTab();

		await userEvent.selectOptions(await screen.findByLabelText("Command"), "bot");
		await userEvent.selectOptions(screen.getByLabelText("Part"), "uptime");
		await userEvent.click(screen.getByRole("button", { name: /Run it/ }));

		await waitFor(() => {
			expect(captured.body).toMatchObject({ subcommand: "uptime" });
		});
	});

	/** The form is generated from the command's own metadata, so a declared option becomes a field for free. */
	it("builds a field per declared option, and a select for one with choices", async () => {
		renderTab();
		await userEvent.selectOptions(await screen.findByLabelText("Command"), "role-info");

		expect(screen.getByLabelText(/^role/)).toBeInTheDocument();
		expect(screen.getByLabelText(/detail \(optional\)/)).toHaveRole("combobox");
	});

	it("waits for a required option before it will run", async () => {
		renderTab();
		await userEvent.selectOptions(await screen.findByLabelText("Command"), "role-info");

		expect(screen.getByRole("button", { name: /Run it/ })).toBeDisabled();

		await userEvent.type(screen.getByLabelText(/^role/), "300000000000000001");
		expect(screen.getByRole("button", { name: /Run it/ })).toBeEnabled();
	});

	it("asks for a server when the command needs one", async () => {
		renderTab();
		await userEvent.selectOptions(await screen.findByLabelText("Command"), "role-info");

		expect(screen.getByLabelText("Server ID")).toBeInTheDocument();
	});

	it("does not ask for a server when the command does not need one", async () => {
		renderTab();
		await userEvent.selectOptions(await screen.findByLabelText("Command"), "ping");

		expect(screen.queryByLabelText("Server ID")).not.toBeInTheDocument();
	});

	it("sends the arguments that were filled in", async () => {
		const captured = captureRun();
		renderTab();

		await userEvent.selectOptions(await screen.findByLabelText("Command"), "role-info");
		await userEvent.type(screen.getByLabelText("Server ID"), "900000000000000001");
		await userEvent.type(screen.getByLabelText(/^role/), "300000000000000001");
		await userEvent.click(screen.getByRole("button", { name: /Run it/ }));

		await waitFor(() => {
			expect(captured.body).toMatchObject({
				guildId: "900000000000000001",
				args: { role: "300000000000000001" },
			});
		});
	});

	it("clears the form when a different command is picked", async () => {
		renderTab();
		await userEvent.selectOptions(await screen.findByLabelText("Command"), "role-info");
		await userEvent.type(screen.getByLabelText(/^role/), "300000000000000001");

		await userEvent.selectOptions(screen.getByLabelText("Command"), "ping");
		await userEvent.selectOptions(screen.getByLabelText("Command"), "role-info");

		expect(screen.getByLabelText(/^role/)).toHaveValue("");
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

		/**
		 * A button posts back to Discord's interaction endpoint and cannot work here — but a reader who could not
		 * see that the reply had controls would think the command had done less than it did.
		 */
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

		it("says plainly when a command replied with nothing", async () => {
			server.use(http.post("/api/owner/runner/:name", () => HttpResponse.json({ ...runResult, outputs: [] })));
			renderTab();

			await userEvent.selectOptions(await screen.findByLabelText("Command"), "ping");
			await userEvent.click(screen.getByRole("button", { name: /Run it/ }));

			expect(await screen.findByText("It replied with nothing.")).toBeInTheDocument();
		});
	});

	it("has no accessibility violations", async () => {
		const { container } = renderTab();
		await screen.findByLabelText("Command");

		await expectNoViolations(container);
	});
});
