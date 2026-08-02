import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { expectNoViolations } from "@/test/axe";
import { botControl, guildDetail } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderTab(tab: string, extra = "") {
	return renderWithProviders(<OwnerPage />, { path: "/owner", route: `/owner?tab=${tab}${extra}` });
}

describe("the control tab", () => {
	it("says whether the bot is running", async () => {
		renderTab("control");

		expect(await screen.findByText("Running")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /pause testify/i })).toBeInTheDocument();
	});

	it("pauses, and offers to resume once paused", async () => {
		const user = userEvent.setup();
		let sent: unknown;
		server.use(
			http.post("/api/control/gateway", async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json({ ...botControl, gateway: "paused", since: "2026-08-01T12:00:00.000Z" });
			}),
		);

		renderTab("control");
		await user.click(await screen.findByRole("button", { name: /pause testify/i }));

		await waitFor(() => {
			expect(sent).toEqual({ action: "pause" });
		});
		expect(await screen.findByRole("button", { name: /resume testify/i })).toBeInTheDocument();
	});

	/**
	 * Shutting down ends the process this page is served by, so it is typed rather than clicked — and the
	 * button stays disabled until the words match exactly.
	 */
	it("keeps shut down disabled until it is typed out", async () => {
		const user = userEvent.setup();
		renderTab("control");

		const button = await screen.findByRole("button", { name: /^shut down$/i });
		expect(button).toBeDisabled();

		await user.type(screen.getByLabelText(/type .* to confirm/i), "shut dow");
		expect(button).toBeDisabled();

		await user.type(screen.getByLabelText(/type .* to confirm/i), "n");
		expect(button).toBeEnabled();
	});

	it("says plainly that nothing here can start it again", async () => {
		renderTab("control");

		expect(await screen.findByText(/nothing here can start it again/i)).toBeInTheDocument();
	});

	/** Discord has no per-server avatar for bots, and the screen has to say so rather than offering one. */
	it("explains that the picture is global and the nickname is not", async () => {
		renderTab("control");

		expect(await screen.findByText(/no per-server picture for bots/i)).toBeInTheDocument();
	});

	it("renames the bot", async () => {
		const user = userEvent.setup();
		let sent: unknown;
		server.use(
			http.patch("/api/control/identity", async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json({
					id: "1",
					username: "Renamed",
					avatarUrl: null,
					bannerUrl: null,
					accentColour: null,
				});
			}),
		);

		renderTab("control");
		const field = await screen.findByLabelText("Username");
		await user.clear(field);
		await user.type(field, "Renamed");
		await user.click(screen.getByRole("button", { name: "Rename" }));

		await waitFor(() => {
			expect(sent).toEqual({ username: "Renamed" });
		});
	});

	it("shows a refusal from Discord rather than swallowing it", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch("/api/control/identity", () =>
				HttpResponse.json(
					{ error: { code: "bad_request", message: "You are changing your username too fast." } },
					{ status: 400 },
				),
			),
		);

		renderTab("control");
		const field = await screen.findByLabelText("Username");
		await user.clear(field);
		await user.type(field, "Renamed");
		await user.click(screen.getByRole("button", { name: "Rename" }));

		expect(await screen.findByText(/too fast/i)).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderTab("control");
		await screen.findByText("Running");

		await expectNoViolations(container);
	});
});

describe("a server's detail", () => {
	it("opens from the URL and describes the server", async () => {
		renderTab("overview", `&server=${guildDetail.id}`);

		expect(await screen.findByRole("heading", { name: guildDetail.name })).toBeInTheDocument();
		expect(screen.getByText("1,234")).toBeInTheDocument();
		expect(screen.getByText("Testy")).toBeInTheDocument();
	});

	it("names what that server is missing", async () => {
		renderTab("overview", `&server=${guildDetail.id}`);

		expect(await screen.findByText(/missing in this server: manage roles/i)).toBeInTheDocument();
	});

	it("links through to its settings", async () => {
		renderTab("overview", `&server=${guildDetail.id}`);

		expect(await screen.findByRole("link", { name: /open its settings/i })).toHaveAttribute(
			"href",
			`/guilds/${guildDetail.id}`,
		);
	});

	it("closes back to the table", async () => {
		const user = userEvent.setup();
		const { search } = renderTab("overview", `&server=${guildDetail.id}`);

		await user.click(await screen.findByRole("button", { name: `Close ${guildDetail.name}` }));

		expect(search()).not.toContain("server=");
	});

	it("shows nothing until a server is chosen", async () => {
		renderTab("overview");
		await screen.findByRole("heading", { name: "Servers" });

		expect(screen.queryByRole("heading", { name: guildDetail.name })).toBeNull();
	});
});
