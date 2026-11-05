import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { RequireAuth } from "@/app/RequireAuth";
import { expectNoViolations } from "@/test/axe";
import { me } from "@/test/fixtures/session";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const blocked = {
	...me,
	guilds: [],
	blacklist: {
		reason: "Spamming commands",
		since: "2026-11-01T10:00:00.000Z",
		owners: [
			{ id: "100000000000000009", name: "kermit" },
			{ id: "100000000000000008", name: "piggy" },
		],
	},
};

function renderAt(route: string): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(
		<Routes>
			<Route element={<RequireAuth />}>
				<Route path="*" element={<p>A signed-in screen</p>} />
			</Route>
		</Routes>,
		{ path: "*", route },
	);
}

describe("a blacklisted account's dashboard", () => {
	/** The API refuses it everything but deleting its data, so no other screen may even begin to draw. */
	it("shows why and whom to ask in place of every signed-in screen, and offers only Delete my data", async () => {
		server.use(http.get("/api/auth/me", () => HttpResponse.json(blocked)));

		for (const route of ["/guilds", "/guilds/900000000000000001/settings", "/owner", "/account?tab=profile"]) {
			const { unmount } = renderAt(route);
			expect(await screen.findByRole("heading", { level: 1, name: /You’re blocked from/ })).toBeInTheDocument();
			expect(screen.queryByText("A signed-in screen")).toBeNull();
			unmount();
		}

		renderAt("/guilds");
		expect(await screen.findByText("Spamming commands")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "kermit" })).toHaveAttribute(
			"href",
			"https://discord.com/users/100000000000000009",
		);
		expect(screen.getByRole("link", { name: "piggy" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Delete my data" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
		expect(screen.queryByRole("tab")).toBeNull();
	});

	it("shows every other reader the screen they asked for", async () => {
		renderAt("/guilds");

		expect(await screen.findByText("A signed-in screen")).toBeInTheDocument();
	});

	it("passes axe", async () => {
		server.use(http.get("/api/auth/me", () => HttpResponse.json(blocked)));
		const { container } = renderAt("/guilds");

		await screen.findByText("Spamming commands");
		await expectNoViolations(container);
	});
});
