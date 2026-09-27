import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { WarningsPage } from "@/features/warnings/WarningsPage";
import { expectNoViolations } from "@/test/axe";
import { guildWarnings } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";
const KATE = "100000000000000002";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<WarningsPage />, {
		route: `/guilds/${GUILD}/warnings`,
		path: "/guilds/:guildId/warnings",
	});
}

describe("the warnings page", () => {
	it("lists every warning with who it was for, why, and who gave it", async () => {
		renderPage();

		expect(await screen.findByText("Spamming in general")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "kate" })).toHaveAttribute("href", `/guilds/${GUILD}/members/${KATE}`);
		expect(screen.getByText(/By someone/)).toBeInTheDocument();
	});

	it("shows each punishment step as its own picker", async () => {
		renderPage();

		expect(await screen.findByLabelText("Warning 2")).toHaveValue("timeout-10");
		expect(screen.getByLabelText("Warning 4")).toHaveValue("ban");
	});

	/** The list is the control, so a change sends the whole of it in one request. */
	it("saves the whole list when one step changes", async () => {
		let body: unknown;
		server.use(
			http.put(`/api/guilds/${GUILD}/warnings/punishments`, async ({ request }) => {
				body = await request.json();
				return HttpResponse.json(body as object);
			}),
		);
		renderPage();

		await userEvent.selectOptions(await screen.findByLabelText("Warning 1"), "timeout-5");

		await waitFor(() => {
			expect(body).toEqual({
				steps: [
					{ action: "timeout", minutes: 5 },
					{ action: "timeout", minutes: 10 },
					{ action: "kick" },
					{ action: "ban" },
				],
			});
		});
	});

	it("adds a step that is only a warning", async () => {
		let body: { steps: unknown[] } | undefined;
		server.use(
			http.put(`/api/guilds/${GUILD}/warnings/punishments`, async ({ request }) => {
				body = (await request.json()) as { steps: unknown[] };
				return HttpResponse.json(body as object);
			}),
		);
		renderPage();

		await userEvent.click(await screen.findByRole("button", { name: /Add a step/ }));

		await waitFor(() => {
			expect(body?.steps.at(-1)).toEqual({ action: "warn" });
		});
	});

	/** Picking somebody from a search is the whole point: nobody should have to paste an ID. */
	it("warns a member found by name and says what it did", async () => {
		let body: unknown;
		server.use(
			http.post(`/api/guilds/${GUILD}/warnings`, async ({ request }) => {
				body = await request.json();
				return HttpResponse.json({
					warning: guildWarnings.items[0],
					outcome: { count: 3, step: { action: "kick" }, problem: null },
				});
			}),
		);
		renderPage();

		await userEvent.type(await screen.findByLabelText(/Find a member/), "ka");
		await userEvent.click(await screen.findByRole("button", { name: /kate/ }));
		await userEvent.type(screen.getByLabelText("Reason"), "Spamming again");
		await userEvent.click(screen.getByRole("button", { name: "Warn" }));

		expect(await screen.findByText("kate: Warning 3 recorded: Kick.")).toBeInTheDocument();
		expect(body).toEqual({ userId: KATE, reason: "Spamming again" });
	});

	/** A moderator often has an ID from a report rather than a name, and a pasted one should just work. */
	it("finds somebody by a pasted Discord ID", async () => {
		let asked = "";
		server.use(
			http.get(`/api/guilds/${GUILD}/members/search`, ({ request }) => {
				asked = new URL(request.url).searchParams.get("q") ?? "";
				return HttpResponse.json([{ userId: KATE, displayName: "kate", username: "kate", avatarUrl: null }]);
			}),
		);
		renderPage();

		await userEvent.type(await screen.findByLabelText(/Find a member/), KATE);

		expect(await screen.findByRole("button", { name: /kate/ })).toBeInTheDocument();
		expect(asked).toBe(KATE);
	});

	it("will not warn until somebody is chosen", async () => {
		renderPage();

		await userEvent.type(await screen.findByLabelText("Reason"), "Spamming");

		expect(screen.getByRole("button", { name: "Warn" })).toBeDisabled();
	});

	it("says so when nobody matches", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/members/search`, () => HttpResponse.json([])));
		renderPage();

		await userEvent.type(await screen.findByLabelText(/Find a member/), "zz");

		expect(await screen.findByText(/Nobody in this server matches/)).toBeInTheDocument();
	});

	it("removes a warning from the list", async () => {
		let removed = "";
		server.use(
			http.delete(`/api/guilds/${GUILD}/warnings/:userId/:warnId`, ({ params }) => {
				removed = `${String(params.userId)}/${String(params.warnId)}`;
				return new HttpResponse(null, { status: 204 });
			}),
		);
		renderPage();

		await userEvent.click(await screen.findByRole("button", { name: /^Remove$/ }));

		await waitFor(() => {
			expect(removed).toBe(`${KATE}/a1b2c3d4`);
		});
	});

	/** A card that could only say "nothing here" is noise on a page with two other jobs. */
	it("leaves the list out altogether while the server has no warnings", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/warnings`, () => HttpResponse.json({ items: [], total: 0, page: 1, perPage: 5 })),
		);
		renderPage();
		await screen.findByLabelText("Warning 1");

		await waitFor(() => {
			expect(screen.queryByLabelText(/Find a member’s warnings/)).not.toBeInTheDocument();
		});
		expect(screen.queryByRole("heading", { name: "Recent warnings" })).not.toBeInTheDocument();
	});

	it("asks for only the five most recent until somebody searches", async () => {
		const asked: string[] = [];
		server.use(
			http.get(`/api/guilds/${GUILD}/warnings`, ({ request }) => {
				asked.push(new URL(request.url).search);
				return HttpResponse.json(guildWarnings);
			}),
		);
		renderPage();

		expect(await screen.findByRole("heading", { name: "Recent warnings" })).toBeInTheDocument();
		expect(asked[0]).toBe("?page=1&perPage=5");
	});

	it("searches a member's warnings by name or pasted ID", async () => {
		const asked: string[] = [];
		server.use(
			http.get(`/api/guilds/${GUILD}/warnings`, ({ request }) => {
				asked.push(new URL(request.url).searchParams.get("q") ?? "");
				return HttpResponse.json(guildWarnings);
			}),
		);
		renderPage();

		await userEvent.type(await screen.findByLabelText(/Find a member’s warnings/), KATE);

		expect(await screen.findByRole("heading", { name: "Search results" })).toBeInTheDocument();
		expect(asked).toContain(KATE);
	});

	it("says so when a search finds nothing, and keeps the box to try again", async () => {
		renderPage();
		const box = await screen.findByLabelText(/Find a member’s warnings/);
		server.use(
			http.get(`/api/guilds/${GUILD}/warnings`, () => HttpResponse.json({ items: [], total: 0, page: 1, perPage: 20 })),
		);

		await userEvent.type(box, "nobody");

		expect(await screen.findByText("No warnings for that name or ID.")).toBeInTheDocument();
		expect(screen.getByLabelText(/Find a member’s warnings/)).toBeInTheDocument();
	});

	/** The row said who and why but not what happened, which is the thing a moderator reviewing it needs. */
	it("says what each warning did", async () => {
		renderPage();

		expect(await screen.findByText("Time out for 10 minutes", { selector: "span" })).toBeInTheDocument();
	});

	it("offers a retry rather than an empty page when the list cannot be read", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/warnings`, () => HttpResponse.error()));
		renderPage();

		expect(await screen.findAllByRole("button", { name: /try again/i })).not.toHaveLength(0);
	});

	it("shows why a change to the steps was refused", async () => {
		server.use(
			http.put(`/api/guilds/${GUILD}/warnings/punishments`, () =>
				HttpResponse.json({ error: { code: "forbidden", message: "You cannot manage that server." } }, { status: 403 }),
			),
		);
		renderPage();

		await userEvent.click(await screen.findByRole("button", { name: /Remove the last step/ }));

		expect(await screen.findByText(/cannot manage that server/)).toBeInTheDocument();
	});

	it("has no obvious accessibility problems", async () => {
		const { container } = renderPage();
		await screen.findByText("Spamming in general");

		await expectNoViolations(container);
	});
});
