import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { RoleMenusPage } from "@/features/role-menus/RoleMenusPage";
import { expectNoViolations } from "@/test/axe";
import { roleMenuList } from "@/test/fixtures/community";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<RoleMenusPage />, {
		route: `/guilds/${GUILD}/role-menus`,
		path: "/guilds/:guildId/role-menus",
	});
}

describe("the role menus page", () => {
	/** Offering an admin role on a self-assign menu would let anybody moderate the server. */
	it("greys out a role that administers, and says why", async () => {
		renderPage();

		const admin = await screen.findByRole("checkbox", { name: /Admin/ });
		expect(admin).toBeDisabled();
		expect(screen.getByText("above Testify")).toBeInTheDocument();
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
