import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { expectNoViolations } from "@/test/axe";
import { musicNotice } from "@/test/fixtures/bot";
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

describe("the notifications card", () => {
	function capture(method: "post" | "patch" | "delete"): { bodies: unknown[]; urls: string[] } {
		const seen = { bodies: [] as unknown[], urls: [] as string[] };
		const path = method === "post" ? "/api/owner/notices" : "/api/owner/notices/:noticeId";
		server.use(
			http[method](path, async ({ request }) => {
				seen.urls.push(new URL(request.url).pathname);
				seen.bodies.push(method === "delete" ? null : await request.json());
				return method === "delete" ? new HttpResponse(null, { status: 204 }) : HttpResponse.json(musicNotice);
			}),
		);
		return seen;
	}

	async function row(): Promise<HTMLElement> {
		return (await screen.findByRole("heading", { name: musicNotice.title })).closest("li") as HTMLElement;
	}

	it("posts a notification with its kind, and empties the form after", async () => {
		const user = userEvent.setup();
		const sent = capture("post");
		renderTab("control");

		const post = await screen.findByRole("button", { name: "Post a notification" });
		expect(post).toBeDisabled();
		const form = post.closest<HTMLElement>("div.flex-col")!;
		await user.type(within(form).getByLabelText("Title"), "Music is down");
		await user.type(within(form).getByLabelText(/What everybody should know/), "Soon.");
		await user.click(within(form).getByRole("button", { name: "Problem" }));
		await user.click(post);

		await waitFor(() => {
			expect(sent.bodies).toEqual([{ title: "Music is down", body: "Soon.", tone: "problem" }]);
		});
		await waitFor(() => {
			expect(within(form).getByLabelText("Title")).toHaveValue("");
		});
	});

	/** The Discord panel cannot draw more than this, so the web refuses before the server has to. */
	it("refuses another once as many are up as Discord can show", async () => {
		server.use(
			http.get("/api/owner/notices", () =>
				HttpResponse.json(Array.from({ length: 5 }, (_, index) => ({ ...musicNotice, id: String(index).repeat(24) }))),
			),
		);
		const user = userEvent.setup();
		renderTab("control");

		expect(await screen.findByText(/5 is as many as can be up at once/)).toBeInTheDocument();
		const post = screen.getByRole("button", { name: "Post a notification" });
		const form = post.closest<HTMLElement>("div.flex-col")!;
		await user.type(within(form).getByLabelText("Title"), "One more");
		await user.type(within(form).getByLabelText(/What everybody should know/), "Soon.");
		expect(post).toBeDisabled();
	});

	it("edits one in place, and tells everybody again only when asked", async () => {
		const user = userEvent.setup();
		const sent = capture("patch");
		renderTab("control");

		await user.click(within(await row()).getByRole("button", { name: "Tell everybody again" }));
		await user.click(within(await row()).getByRole("button", { name: "Edit" }));
		const editor = screen.getByRole("button", { name: "Save" }).closest("li") as HTMLElement;
		const title = within(editor).getByLabelText("Title");
		await user.clear(title);
		await user.type(title, "Music is back");
		await user.click(within(editor).getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(sent.bodies).toEqual([
				{ notifyAgain: true },
				{ title: "Music is back", body: musicNotice.body, tone: musicNotice.tone },
			]);
		});
		expect(sent.urls).toEqual([`/api/owner/notices/${musicNotice.id}`, `/api/owner/notices/${musicNotice.id}`]);
	});

	it("asks before removing one", async () => {
		const user = userEvent.setup();
		const sent = capture("delete");
		renderTab("control");

		await user.click(within(await row()).getByRole("button", { name: "Remove" }));
		expect(sent.urls).toEqual([]);
		await user.click(within(await row()).getByRole("button", { name: "Remove it" }));

		await waitFor(() => {
			expect(sent.urls).toEqual([`/api/owner/notices/${musicNotice.id}`]);
		});
	});

	/** A change the server refused has to say so beside the control that made it. */
	it("says so beside the notification when a change is refused", async () => {
		const user = userEvent.setup();
		server.use(
			http.patch("/api/owner/notices/:noticeId", () =>
				HttpResponse.json({ error: { code: "not_found", message: "That notification is gone." } }, { status: 404 }),
			),
		);
		renderTab("control");

		await user.click(within(await row()).getByRole("button", { name: "Tell everybody again" }));

		expect(await within(await row()).findByText("That notification is gone.")).toBeInTheDocument();
	});

	/** Its read is its own, so a failure here must not take pause or shut down with it. */
	it("keeps the rest of the tab working when the notifications cannot be read", async () => {
		server.use(http.get("/api/owner/notices", () => HttpResponse.json({}, { status: 500 })));
		renderTab("control");

		expect(await screen.findByRole("button", { name: /pause testify/i })).toBeInTheDocument();
		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Post a notification" })).toBeNull();
	});
});
