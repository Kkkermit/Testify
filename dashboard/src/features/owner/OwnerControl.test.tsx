import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderTab(tab: string, extra = "") {
	return renderWithProviders(<OwnerPage />, { path: "/owner", route: `/owner?tab=${tab}${extra}` });
}

describe("the control tab", () => {
	/** A refusal that only reverted the control would read as the click not registering. */
	it("says so when the change is refused, and leaves the old choice pressed", async () => {
		const user = userEvent.setup();
		server.use(
			http.put("/api/control/music", () =>
				HttpResponse.json({ error: { code: "bad_request", message: "Not today." } }, { status: 400 }),
			),
		);

		renderTab("control");
		await user.click(await screen.findByRole("button", { name: "YouTube" }));

		expect(await screen.findByText("Not today.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Both" })).toHaveAttribute("aria-pressed", "true");
	});

	/** Its read is its own, so a failure here must not take pause or shut down with it. */
	it("keeps the rest of the tab working when the sources cannot be read", async () => {
		server.use(http.get("/api/control/music", () => HttpResponse.json({}, { status: 500 })));

		renderTab("control");

		expect(await screen.findByRole("button", { name: /pause testify/i })).toBeInTheDocument();
		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
	});

	/** Shutting down ends the process this page is served by, so it is typed rather than clicked. */
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

	/** A refused shutdown has to say so, because success and failure otherwise look identical. */
	it("says so when the shutdown is refused", async () => {
		const user = userEvent.setup();
		server.use(
			http.post("/api/control/shutdown", () =>
				HttpResponse.json({ error: { code: "forbidden", message: "The host refused that." } }, { status: 403 }),
			),
		);

		renderTab("control");
		await user.type(await screen.findByLabelText(/type .* to confirm/i), "shut down");
		await user.click(screen.getByRole("button", { name: /^shut down$/i }));

		expect(await screen.findByText("The host refused that.")).toBeInTheDocument();
		expect(screen.queryByText(/testify is stopping/i)).toBeNull();
	});

	/** Notifications have a tab of their own, so this one stays about the bot itself. */
	it("leaves notifications to their own tab", async () => {
		renderTab("control");

		await screen.findByRole("button", { name: /pause testify/i });
		expect(screen.queryByRole("button", { name: "Post a notification" })).toBeNull();
	});

	/** Shutting down takes the dashboard with it, so the screen has to say who can bring it back before the click. */
	it("says plainly that only the host can start it again", async () => {
		renderTab("control");

		expect(await screen.findByText(/only your host can start it again/i)).toBeInTheDocument();
	});

	/** Discord has no per-server avatar for bots, and the screen has to say so rather than offering one. */
	it("explains that the picture is global and the nickname is not", async () => {
		renderTab("control");

		expect(await screen.findByText(/no per-server picture for bots/i)).toBeInTheDocument();
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
