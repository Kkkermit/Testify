import { type IdeaDecision } from "@testify/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { IdeasPage } from "@/features/ideas/IdeasPage";
import { expectNoViolations } from "@/test/axe";
import { ideaPage, ideaSettings } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";
const OPEN_IDEA = ideaPage.items[0]?.id ?? "";

function renderPage(query = ""): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<IdeasPage />, {
		route: `/guilds/${GUILD}/ideas${query}`,
		path: "/guilds/:guildId/ideas",
	});
}

function rowFor(heading: string): HTMLElement {
	return screen.getByRole("heading", { name: heading }).closest("li") ?? document.body;
}

describe("the idea board page", () => {
	it("lists each idea with its votes and where it stands", async () => {
		renderPage();

		await screen.findByRole("heading", { name: "Idea #2" });
		const open = rowFor("Idea #2");
		expect(within(open).getByText("A channel for pets.")).toBeInTheDocument();
		expect(within(open).getByText("Open")).toBeInTheDocument();
		expect(within(open).getByText(/Votes for/).parentElement).toHaveTextContent("5");

		const accepted = rowFor("Idea #1");
		expect(within(accepted).getByText("Accepted")).toBeInTheDocument();
		expect(within(accepted).getByText("Starting Friday.")).toBeInTheDocument();
	});

	/** Deciding here goes through the same path as the staff buttons, so the reason typed is the one the author gets. */
	it("accepts an idea with the reason typed beside it", async () => {
		const sent: { id: string; body: IdeaDecision }[] = [];
		server.use(
			http.post(`/api/guilds/${GUILD}/ideas/:ideaId/decision`, async ({ params, request }) => {
				sent.push({ id: String(params.ideaId), body: (await request.json()) as IdeaDecision });
				return HttpResponse.json(ideaPage.items[0]);
			}),
		);
		renderPage();

		await screen.findByRole("heading", { name: "Idea #2" });
		const open = rowFor("Idea #2");
		await userEvent.type(within(open).getByLabelText(/Reason/), "Love it");
		await userEvent.click(within(open).getByRole("button", { name: "Accept" }));

		await waitFor(() => {
			expect(sent).toEqual([{ id: OPEN_IDEA, body: { status: "accepted", reason: "Love it" } }]);
		});
	});

	it("reopens a decided idea", async () => {
		const sent: IdeaDecision[] = [];
		server.use(
			http.post(`/api/guilds/${GUILD}/ideas/:ideaId/decision`, async ({ request }) => {
				sent.push((await request.json()) as IdeaDecision);
				return HttpResponse.json(ideaPage.items[1]);
			}),
		);
		renderPage();

		await screen.findByRole("heading", { name: "Idea #1" });
		await userEvent.click(within(rowFor("Idea #1")).getByRole("button", { name: "Reopen" }));

		await waitFor(() => {
			expect(sent[0]?.status).toBe("open");
		});
	});

	it("asks the API for the filter chosen, from the first page", async () => {
		const seen: URLSearchParams[] = [];
		server.use(
			http.get(`/api/guilds/${GUILD}/ideas/list`, ({ request }) => {
				seen.push(new URL(request.url).searchParams);
				return HttpResponse.json(ideaPage);
			}),
		);
		renderPage("?page=3");

		await userEvent.click(await screen.findByRole("button", { name: "Accepted (1)" }));

		await waitFor(() => {
			expect(seen.at(-1)?.get("status")).toBe("accepted");
		});
		expect(seen.at(-1)?.get("page")).toBe("1");
	});

	it("turns the board off", async () => {
		const sent: unknown[] = [];
		server.use(
			http.patch(`/api/guilds/${GUILD}/ideas`, async ({ request }) => {
				sent.push(await request.json());
				return HttpResponse.json({ ...ideaSettings, enabled: false });
			}),
		);
		renderPage();

		await userEvent.click(await screen.findByRole("switch", { name: /Members can post ideas/ }));

		await waitFor(() => {
			expect(sent).toEqual([{ enabled: false }]);
		});
	});

	it("will not turn the board on with nowhere to post", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/ideas`, () =>
				HttpResponse.json({ ...ideaSettings, enabled: false, channelId: null }),
			),
		);
		renderPage();

		expect(await screen.findByRole("switch", { name: /Members can post ideas/ })).toBeDisabled();
		expect(screen.getByText("Pick a channel first.")).toBeInTheDocument();
	});

	it("deletes an idea by its own id", async () => {
		const deleted: string[] = [];
		server.use(
			http.delete(`/api/guilds/${GUILD}/ideas/:ideaId`, ({ params }) => {
				deleted.push(String(params.ideaId));
				return new HttpResponse(null, { status: 204 });
			}),
		);
		renderPage();

		await userEvent.click(await screen.findByRole("button", { name: "Delete idea #2" }));

		await waitFor(() => {
			expect(deleted).toEqual([OPEN_IDEA]);
		});
	});

	it("says so when nothing has been posted", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/ideas/list`, () => HttpResponse.json({ ...ideaPage, items: [], total: 0 })),
		);
		renderPage();

		expect(await screen.findByText("No ideas yet")).toBeInTheDocument();
	});

	/** A failed list read must not look like an empty board. */
	it("says the list could not be read rather than showing none", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/ideas/list`, () => HttpResponse.json({}, { status: 500 })));
		renderPage();

		expect(await screen.findByRole("button", { name: /Try again/ })).toBeInTheDocument();
		expect(screen.queryByText("No ideas yet")).toBeNull();
	});

	it("has no automatically detectable violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { name: "Idea #2" });

		await expectNoViolations(container);
	});
});
