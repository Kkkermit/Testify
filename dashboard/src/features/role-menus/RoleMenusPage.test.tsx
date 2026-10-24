import { type RoleMenuBody } from "@testify/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { RoleMenusPage } from "@/features/role-menus/RoleMenusPage";
import { expectNoViolations } from "@/test/axe";
import { roleMenuList } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";
const MENU = roleMenuList.menus[0]?.id ?? "";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<RoleMenusPage />, {
		route: `/guilds/${GUILD}/role-menus`,
		path: "/guilds/:guildId/role-menus",
	});
}

/** Records the bodies sent to one route, answering with the default list. */
function capture(method: "post" | "put", path: string): RoleMenuBody[] {
	const seen: RoleMenuBody[] = [];
	server.use(
		http[method](path, async ({ request }) => {
			seen.push((await request.json()) as RoleMenuBody);
			return HttpResponse.json(roleMenuList);
		}),
	);
	return seen;
}

/** True when the page would have the browser ask before a reload or a closed tab. */
function asksBeforeUnload(): boolean {
	const event = new Event("beforeunload", { cancelable: true });
	window.dispatchEvent(event);
	return event.defaultPrevented;
}

describe("the role menus page", () => {
	it("lists each menu with its channel and the roles it offers", async () => {
		renderPage();

		const menu = await screen.findByRole("heading", { name: "Pick your pings" });
		const row = menu.closest("li") ?? document.body;
		expect(within(row).getByText(/#general/)).toBeInTheDocument();
		expect(within(row).getByRole("list", { name: "Roles in Pick your pings" })).toHaveTextContent(/Member.*Booster/);
		expect(within(row).getByText("Posted")).toBeInTheDocument();
	});

	/** Offering an admin role on a self-assign menu would let anybody moderate the server. */
	it("greys out a role that administers, and says why", async () => {
		renderPage();

		const admin = await screen.findByRole("checkbox", { name: /Admin/ });
		expect(admin).toBeDisabled();
		expect(screen.getByText("above Testify")).toBeInTheDocument();
	});

	it("makes a menu from what was filled in", async () => {
		const sent = capture("post", `/api/guilds/${GUILD}/role-menus`);
		renderPage();

		await userEvent.selectOptions(await screen.findByLabelText(/^Posted in/), "#general");
		await userEvent.type(screen.getByLabelText("Title"), "Regions");
		await userEvent.click(screen.getByRole("button", { name: "Only one" }));
		await userEvent.click(screen.getByRole("checkbox", { name: /Member/ }));
		await userEvent.click(screen.getByRole("button", { name: /Make menu/ }));

		await waitFor(() => {
			expect(sent).toEqual([
				{
					channelId: "400000000000000001",
					title: "Regions",
					description: "",
					roleIds: ["300000000000000001"],
					mode: "one",
				},
			]);
		});
	});

	it("asks before leaving a half-made menu, and not after it is made", async () => {
		capture("post", `/api/guilds/${GUILD}/role-menus`);
		renderPage();

		await userEvent.type(await screen.findByLabelText("Title"), "Regions");
		expect(asksBeforeUnload()).toBe(true);

		await userEvent.selectOptions(screen.getByLabelText(/^Posted in/), "#general");
		await userEvent.click(screen.getByRole("checkbox", { name: /Member/ }));
		await userEvent.click(screen.getByRole("button", { name: /Make menu/ }));

		await waitFor(() => {
			expect(asksBeforeUnload()).toBe(false);
		});
	});

	it("will not make a menu with no roles", async () => {
		renderPage();

		await userEvent.selectOptions(await screen.findByLabelText(/^Posted in/), "#general");
		await userEvent.type(screen.getByLabelText("Title"), "Regions");

		expect(screen.getByRole("button", { name: /Make menu/ })).toBeDisabled();
		expect(screen.getByText("Pick at least one role to offer.")).toBeInTheDocument();
	});

	it("edits a menu in the same form, filled in with what it has", async () => {
		const sent = capture("put", `/api/guilds/${GUILD}/role-menus/:menuId`);
		renderPage();

		await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
		expect(screen.getByRole("heading", { name: "Edit Pick your pings" })).toBeInTheDocument();
		expect(screen.getByLabelText("Title")).toHaveValue("Pick your pings");

		await userEvent.click(screen.getByRole("checkbox", { name: /Booster/ }));
		await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

		await waitFor(() => {
			expect(sent[0]?.roleIds).toEqual(["300000000000000001"]);
		});
	});

	/** The post follows the change; a refusal says so beside the form rather than failing silently. */
	it("says when a change could not reach the post", async () => {
		server.use(
			http.put(`/api/guilds/${GUILD}/role-menus/:menuId`, () =>
				HttpResponse.json(
					{ error: { code: "bad_request", message: "Saved, but the post was not updated." } },
					{ status: 400 },
				),
			),
		);
		renderPage();

		await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
		await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

		expect(await screen.findByText("Saved, but the post was not updated.")).toBeInTheDocument();
	});

	it("posts a menu from its row", async () => {
		const posted: string[] = [];
		server.use(
			http.post(`/api/guilds/${GUILD}/role-menus/:menuId/publish`, ({ params }) => {
				posted.push(String(params.menuId));
				return HttpResponse.json(roleMenuList);
			}),
		);
		renderPage();

		await userEvent.click(await screen.findByRole("button", { name: /Update post/ }));

		await waitFor(() => {
			expect(posted).toEqual([MENU]);
		});
	});

	it("deletes a menu by its own id", async () => {
		const deleted: string[] = [];
		server.use(
			http.delete(`/api/guilds/${GUILD}/role-menus/:menuId`, ({ params }) => {
				deleted.push(String(params.menuId));
				return HttpResponse.json({ limit: 10, menus: [] });
			}),
		);
		renderPage();

		await userEvent.click(await screen.findByRole("button", { name: "Delete the menu Pick your pings" }));

		// Gone from the list at once, and sent only when the undo window closes, which leaving the page does too.
		expect(screen.queryByRole("button", { name: "Delete the menu Pick your pings" })).not.toBeInTheDocument();
		expect(screen.getByText("Deleted the role menu “Pick your pings”.")).toBeInTheDocument();
		expect(deleted).toEqual([]);
		window.dispatchEvent(new Event("pagehide"));
		await waitFor(() => {
			expect(deleted).toEqual([MENU]);
		});
	});

	it("puts a deleted menu back on Undo, and deletes nothing", async () => {
		const deleted: string[] = [];
		server.use(
			http.delete(`/api/guilds/${GUILD}/role-menus/:menuId`, ({ params }) => {
				deleted.push(String(params.menuId));
				return HttpResponse.json({ limit: 10, menus: [] });
			}),
		);
		renderPage();

		await userEvent.click(await screen.findByRole("button", { name: "Delete the menu Pick your pings" }));
		await userEvent.click(screen.getByRole("button", { name: "Undo" }));
		window.dispatchEvent(new Event("pagehide"));

		expect(screen.getByRole("button", { name: "Delete the menu Pick your pings" })).toBeInTheDocument();
		expect(deleted).toEqual([]);
	});

	it("says so when there are no menus yet", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/role-menus`, () => HttpResponse.json({ limit: 10, menus: [] })));
		renderPage();

		expect(await screen.findByText("No role menus yet")).toBeInTheDocument();
	});

	it("stops offering a new menu at the limit", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/role-menus`, () => HttpResponse.json({ ...roleMenuList, limit: 1 })));
		renderPage();

		expect(await screen.findByText(/as many menus as a server can have/)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Make menu/ })).toBeNull();
	});

	it("has no automatically detectable violations", async () => {
		const { container } = renderPage();
		await screen.findByRole("heading", { name: "Pick your pings" });

		await expectNoViolations(container);
	});
});
