import { type ScheduledMessageList } from "@testify/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toLocalInput } from "@/features/scheduled-messages/scheduledMessages.utils";
import { ScheduledMessagesPage } from "@/features/scheduled-messages/ScheduledMessagesPage";
import { expectNoViolations } from "@/test/axe";
import { scheduledMessageList } from "@/test/fixtures/channels";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";
const ENTRY = scheduledMessageList.messages[0]!;

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<ScheduledMessagesPage />, {
		route: `/guilds/${GUILD}/scheduled-messages`,
		path: "/guilds/:guildId/scheduled-messages",
	});
}

const row = async (): Promise<HTMLElement> =>
	(await screen.findByRole("heading", { name: /#general ·/ })).closest("li") as HTMLElement;

const addCard = (): HTMLElement => screen.getByRole("region", { name: /schedule a message/i });

const inADay = (): string => toLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000));

describe("the scheduled messages page", () => {
	it("lists each message against its channel, with how often it repeats", async () => {
		renderPage();

		const entry = await row();
		expect(within(entry).getByText("Every week", { selector: "span" })).toBeInTheDocument();
		expect(within(entry).getByLabelText(/^Message/)).toHaveValue(ENTRY.message);
		expect(screen.getByText("1 of 10")).toBeInTheDocument();
	});

	it("says so when there are none", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/scheduled-messages`, () => HttpResponse.json({ limit: 10, messages: [] })),
		);
		renderPage();

		expect(await screen.findByText(/nothing scheduled/i)).toBeInTheDocument();
	});

	/** The picker shows the reader's own clock; what reaches the API is that instant in UTC. */
	it("schedules one at the time picked, sent as UTC", async () => {
		const user = userEvent.setup();
		let body: { nextAt?: string } | undefined;
		server.use(
			http.post(`/api/guilds/${GUILD}/scheduled-messages`, async ({ request }) => {
				body = (await request.json()) as typeof body;
				return HttpResponse.json(scheduledMessageList, { status: 201 });
			}),
		);
		renderPage();
		await row();

		const card = addCard();
		const when = inADay();
		await user.selectOptions(within(card).getByLabelText(/^Post in/), "400000000000000001");
		await user.type(within(card).getByLabelText(/^First post/), when);
		await user.selectOptions(within(card).getByLabelText(/^Repeats/), "daily");
		await user.type(within(card).getByLabelText(/^Message/), "Daily standup");
		await user.click(within(card).getByRole("button", { name: /schedule message/i }));

		await waitFor(() => {
			expect(body).toEqual({
				channelId: "400000000000000001",
				message: "Daily standup",
				repeat: "daily",
				nextAt: new Date(when).toISOString(),
			});
		});
	});

	it("refuses a time already gone before sending anything", async () => {
		const user = userEvent.setup();
		renderPage();
		await row();

		const card = addCard();
		await user.selectOptions(within(card).getByLabelText(/^Post in/), "400000000000000001");
		await user.type(within(card).getByLabelText(/^First post/), "2020-01-01T10:00");
		await user.type(within(card).getByLabelText(/^Message/), "Too late");

		expect(within(card).getByText(/already gone/i)).toBeInTheDocument();
		expect(within(card).getByRole("button", { name: /schedule message/i })).toBeDisabled();
	});

	/** Saving new words must send the stored time back untouched, or a post due now could not be corrected. */
	it("saves an edited row with its time exactly as stored", async () => {
		const user = userEvent.setup();
		let saved: { id: string; body: unknown } | undefined;
		server.use(
			http.put(`/api/guilds/${GUILD}/scheduled-messages/:id`, async ({ params, request }) => {
				saved = { id: String(params.id), body: await request.json() };
				return HttpResponse.json(scheduledMessageList);
			}),
		);
		renderPage();

		const entry = await row();
		await user.type(within(entry).getByLabelText(/^Message/), " Bring snacks.");
		await user.click(within(entry).getByRole("button", { name: /save/i }));

		await waitFor(() => {
			expect(saved).toEqual({
				id: ENTRY.id,
				body: {
					channelId: ENTRY.channelId,
					message: `${ENTRY.message} Bring snacks.`,
					repeat: "weekly",
					nextAt: ENTRY.nextAt,
				},
			});
		});
	});

	it("warns when the bot cannot post in the channel", async () => {
		const blocked: ScheduledMessageList = { limit: 10, messages: [{ ...ENTRY, canSend: false }] };
		server.use(http.get(`/api/guilds/${GUILD}/scheduled-messages`, () => HttpResponse.json(blocked)));
		renderPage();

		expect(within(await row()).getByText(/will be skipped/i)).toBeInTheDocument();
	});

	it("deletes one after the undo window", async () => {
		const user = userEvent.setup();
		const { client } = renderPage();
		await row();

		const empty: ScheduledMessageList = { limit: 10, messages: [] };
		let deleted = "";
		server.use(
			http.delete(`/api/guilds/${GUILD}/scheduled-messages/:id`, ({ params }) => {
				deleted = String(params.id);
				return HttpResponse.json(empty);
			}),
			http.get(`/api/guilds/${GUILD}/scheduled-messages`, () => HttpResponse.json(empty)),
		);

		await user.click(screen.getByRole("button", { name: /delete the scheduled message in #general/i }));
		expect(screen.getByText("Deleted the scheduled message in #general.")).toBeInTheDocument();
		window.dispatchEvent(new Event("pagehide"));

		await waitFor(() => {
			expect(client.isMutating()).toBe(0);
		});
		expect(deleted).toBe(ENTRY.id);
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await row();

		await expectNoViolations(container);
	});
});
