import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { toLocalInput } from "@/features/scheduled-messages/scheduledMessages.utils";
import { expectNoViolations } from "@/test/axe";
import { musicNotice } from "@/test/fixtures/bot";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function renderTab() {
	return renderWithProviders(<OwnerPage />, { path: "/owner", route: "/owner?tab=notifications" });
}

/** The owners' own place for notifications, so finding it does not mean scrolling past pause and shut down. */
it("has a tab of its own in the owner console, and is not on the control tab", async () => {
	renderTab();

	expect(await screen.findByRole("tab", { name: "Notifications", selected: true })).toBeInTheDocument();
	expect(await screen.findByRole("button", { name: "Post a notification" })).toBeInTheDocument();
});

it("has no automatically detectable accessibility violations", async () => {
	const { container } = renderTab();
	await screen.findByRole("heading", { name: musicNotice.title });

	await expectNoViolations(container);
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
		renderTab();

		const post = await screen.findByRole("button", { name: "Post a notification" });
		expect(post).toBeDisabled();
		const form = post.closest<HTMLElement>("div.flex-col")!;
		await user.type(within(form).getByLabelText("Title"), "Music is down");
		await user.type(within(form).getByLabelText(/What everybody should know/), "Soon.");
		await user.click(within(form).getByRole("button", { name: "Problem" }));
		await user.click(post);

		await waitFor(() => {
			expect(sent.bodies).toEqual([{ title: "Music is down", body: "Soon.", tone: "problem", endsAt: null }]);
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
		renderTab();

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
		renderTab();

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
		renderTab();

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
		renderTab();

		await user.click(within(await row()).getByRole("button", { name: "Tell everybody again" }));

		expect(await within(await row()).findByText("That notification is gone.")).toBeInTheDocument();
	});

	it("schedules one for later with an end, and refuses a time that has gone", async () => {
		const user = userEvent.setup();
		const sent = capture("post");
		renderTab();

		const post = await screen.findByRole("button", { name: "Post a notification" });
		const form = post.closest<HTMLElement>("div.flex-col")!;
		await user.type(within(form).getByLabelText("Title"), "Maintenance");
		await user.type(within(form).getByLabelText(/What everybody should know/), "Back soon.");
		await user.click(within(form).getByRole("button", { name: "Later" }));
		const startAt = within(form).getByLabelText(/Goes up at/);

		fireEvent.change(startAt, { target: { value: toLocalInput(new Date(Date.now() - 60 * 60 * 1000)) } });
		expect(within(form).getByText(/That time has already gone/)).toBeInTheDocument();
		expect(post).toBeDisabled();

		fireEvent.change(startAt, { target: { value: toLocalInput(new Date(Date.now() + 2 * 60 * 60 * 1000)) } });
		await user.selectOptions(within(form).getByLabelText(/How long it stays up/), "6");
		await user.click(post);

		await waitFor(() => {
			expect(sent.bodies).toHaveLength(1);
		});
		const body = sent.bodies[0] as { startsAt: string; endsAt: string };
		expect(Date.parse(body.startsAt)).toBeGreaterThan(Date.now());
		expect(Date.parse(body.endsAt) - Date.parse(body.startsAt)).toBe(6 * 60 * 60 * 1000);
	});

	/** Tell everybody again would mean nothing for one not up yet, so it is offered as Post now instead. */
	it("marks one waiting to go up, and posts it now when asked", async () => {
		const user = userEvent.setup();
		const sent = capture("patch");
		const later = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
		server.use(http.get("/api/owner/notices", () => HttpResponse.json([{ ...musicNotice, publishedAt: later }])));
		renderTab();

		const waiting = await row();
		expect(within(waiting).getByText("Scheduled")).toBeInTheDocument();
		expect(within(waiting).getByText(/^Goes up/)).toBeInTheDocument();
		await user.click(within(waiting).getByRole("button", { name: "Post now" }));

		await waitFor(() => {
			expect(sent.bodies).toEqual([{ notifyAgain: true }]);
		});
	});

	/** A list that could not be read must not offer a form that looks like posting into an empty list. */
	it("says the notifications could not be read, and offers a retry instead of the form", async () => {
		server.use(http.get("/api/owner/notices", () => HttpResponse.json({}, { status: 500 })));
		renderTab();

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Post a notification" })).toBeNull();
	});
});
