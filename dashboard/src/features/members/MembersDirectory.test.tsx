import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MembersPage } from "@/features/members/MembersPage";
import { expectNoViolations } from "@/test/axe";
import { memberDirectory } from "@/test/fixtures/moderation";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(route = `/guilds/${GUILD}/members`): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<MembersPage />, { route, path: "/guilds/:guildId/members" });
}

function rowOf(name: string): HTMLElement {
	const link = screen.getByRole("link", { name });
	const row = link.closest("li");
	if (row === null) throw new Error(`no row for ${name}`);
	return row;
}

describe("the member directory", () => {
	/** `?board=` links from before the directory existed still open the boards. */
	it("opens on the directory, and on the boards for an old board link", async () => {
		renderPage();
		expect(await screen.findByRole("link", { name: "Kate" })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: "Directory" })).toHaveAttribute("aria-selected", "true");

		renderPage(`/guilds/${GUILD}/members?board=levels`);
		expect(await screen.findByRole("table")).toBeInTheDocument();
	});

	it("shows who each member is at a glance: roles, joining, a timeout and warnings", async () => {
		renderPage();
		await screen.findByRole("link", { name: "Kate" });

		expect(within(rowOf("Kate")).getByText("Regulars")).toBeInTheDocument();
		expect(within(rowOf("Kate")).getByText("2 warnings")).toBeInTheDocument();
		expect(within(rowOf("Sam")).getByText(/Timed out until/)).toBeInTheDocument();
		expect(within(rowOf("Kate")).getByText(/Joined/)).toBeInTheDocument();
	});

	it("asks the API again with a filter, and keeps it in the address", async () => {
		const asked: URL[] = [];
		server.use(
			http.get(`/api/guilds/${GUILD}/members`, ({ request }) => {
				asked.push(new URL(request.url));
				return HttpResponse.json(memberDirectory);
			}),
		);
		renderPage();
		await screen.findByRole("link", { name: "Kate" });

		await userEvent.selectOptions(screen.getByLabelText("Role"), "Regulars");

		await waitFor(() => {
			expect(asked.at(-1)?.searchParams.get("roleId")).toBe("300000000000000001");
		});
	});

	/** A member the reader cannot moderate shows why in place of the buttons, and the reader is never offered. */
	it("offers on each row only what the reader may do to that member", async () => {
		renderPage();
		await screen.findByRole("link", { name: "Kate" });

		await userEvent.click(within(rowOf("Ada")).getByRole("button", { name: "Actions for Ada" }));
		const ada = rowOf("Ada");
		expect(within(ada).getByRole("button", { name: "Give a role" })).toBeInTheDocument();
		expect(within(ada).queryByRole("button", { name: "Kick" })).not.toBeInTheDocument();
		expect(within(ada).getByText("Their highest role is at or above yours.")).toBeInTheDocument();

		await userEvent.click(within(rowOf("Kate")).getByRole("button", { name: "Actions for Kate" }));
		for (const action of ["Give a role", "Take a role", "Time out", "Warn", "Kick", "Ban"]) {
			expect(within(rowOf("Kate")).getByRole("button", { name: action })).toBeInTheDocument();
		}
		expect(screen.getByRole("checkbox", { name: "Select Kermit" })).toBeDisabled();
	});

	it("kicks one member from their row once their username is typed", async () => {
		renderPage();
		await screen.findByRole("link", { name: "Kate" });
		await userEvent.click(within(rowOf("Kate")).getByRole("button", { name: "Actions for Kate" }));
		await userEvent.click(within(rowOf("Kate")).getByRole("button", { name: "Kick" }));

		const confirm = within(rowOf("Kate")).getByRole("button", { name: "Kick them" });
		await userEvent.type(within(rowOf("Kate")).getByLabelText("Reason"), "spam");
		expect(confirm).toBeDisabled();
		await userEvent.type(within(rowOf("Kate")).getByLabelText(/Type kate to confirm/), "kate");
		expect(confirm).toBeEnabled();
	});

	/** One request can reach several people, so a kick of several asks for their number typed back, and says what happened to each. */
	it("kicks several ticked members after the number is typed, and lists what happened to each", async () => {
		server.use(
			http.post(`/api/guilds/${GUILD}/members/bulk/kick`, () =>
				HttpResponse.json({
					outcomes: [
						{ userId: "100000000000000002", username: "kate", skipped: null },
						{ userId: "100000000000000003", username: "sam", skipped: "failed" },
					],
				}),
			),
		);
		renderPage();
		await screen.findByRole("link", { name: "Kate" });

		await userEvent.click(screen.getByRole("checkbox", { name: "Select Kate" }));
		await userEvent.click(screen.getByRole("checkbox", { name: "Select Sam" }));
		expect(screen.getByText("2 members selected.")).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Kick" }));

		const form = screen.getByRole("region", { name: "Kick" });
		expect(within(form).getByText("For 2 members: Kate, Sam.")).toBeInTheDocument();
		await userEvent.type(within(form).getByLabelText("Reason"), "raid");
		await userEvent.type(within(form).getByLabelText(/Type 2 to confirm/), "3");
		expect(within(form).getByRole("button", { name: "Kick them" })).toBeDisabled();
		await userEvent.clear(within(form).getByLabelText(/Type 2 to confirm/));
		await userEvent.type(within(form).getByLabelText(/Type 2 to confirm/), "2");
		await userEvent.click(within(form).getByRole("button", { name: "Kick them" }));

		expect(await within(form).findByText("1 done, 1 skipped.")).toBeInTheDocument();
		expect(within(form).getByText("Discord refused it.")).toBeInTheDocument();
	});

	it("offers no tick boxes or actions to a reader who may do none of them", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/members`, () =>
				HttpResponse.json({
					...memberDirectory,
					grantable: [],
					can: { roles: false, timeout: false, warn: false, kick: false, ban: false },
				}),
			),
		);
		renderPage();
		await screen.findByRole("link", { name: "Kate" });

		expect(screen.queryByRole("checkbox", { name: /Select/ })).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Has warnings")).not.toBeInTheDocument();
	});

	it("has no accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("link", { name: "Kate" });

		await expectNoViolations(container);
	});
});
