import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { RolePage } from "@/features/roles/RolePage";
import { RolesPage } from "@/features/roles/RolesPage";
import { expectNoViolations } from "@/test/axe";
import { someRoleUses } from "@/test/fixtures/server";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

beforeEach(() => {
	server.use(http.get("/api/guilds/:guildId/role-uses", () => HttpResponse.json(someRoleUses)));
});

describe("the roles page", () => {
	/** A deleted role a setting still names is listed first, since it is the one that has already broken something. */
	it("lists every role with what uses it, and the deleted ones a setting still names", async () => {
		const { container } = renderWithProviders(<RolesPage />, {
			route: `/guilds/${GUILD}/roles`,
			path: "/guilds/:guildId/roles",
		});

		expect(await screen.findByRole("link", { name: /Member Used by 2 features/ })).toHaveAttribute(
			"href",
			`/guilds/${GUILD}/roles/300000000000000001`,
		);
		expect(screen.getByRole("link", { name: /Booster Not used by/ })).toBeInTheDocument();
		expect(screen.getByRole("region", { name: /Deleted roles a setting still names/ })).toHaveTextContent(
			"Used by 1 feature",
		);
		await expectNoViolations(container);
	});
});

describe("one role's page", () => {
	it("names every feature that gives or reads the role, each opening where it is set", async () => {
		const { container } = renderWithProviders(<RolePage />, {
			route: `/guilds/${GUILD}/roles/300000000000000001`,
			path: "/guilds/:guildId/roles/:roleId",
		});

		expect(await screen.findByText(/2 things in .+ give or read this role/)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /Given at level 5/ })).toHaveAttribute(
			"href",
			`/guilds/${GUILD}/levelling`,
		);
		expect(screen.getByRole("link", { name: /Given to everybody who joins/ })).toHaveAttribute(
			"href",
			`/guilds/${GUILD}/settings`,
		);
		await expectNoViolations(container);
	});

	/** A deleted role cannot be looked up by name, but the settings that still name it have to be found. */
	it("says a deleted role is gone and still lists what names it", async () => {
		renderWithProviders(<RolePage />, {
			route: `/guilds/${GUILD}/roles/300000000000000099`,
			path: "/guilds/:guildId/roles/:roleId",
		});

		expect(await screen.findByRole("heading", { level: 1, name: "A role that no longer exists" })).toBeInTheDocument();
		expect(screen.getByText(/no longer exists in the server, but these settings still name it/)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /Handles tickets/ })).toHaveAttribute("href", `/guilds/${GUILD}/tickets`);
	});

	it("says so when what uses the role cannot be read", async () => {
		server.use(http.get("/api/guilds/:guildId/role-uses", () => HttpResponse.json({}, { status: 500 })));
		renderWithProviders(<RolePage />, {
			route: `/guilds/${GUILD}/roles/300000000000000001`,
			path: "/guilds/:guildId/roles/:roleId",
		});

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
	});
});
