import { screen } from "@testing-library/react";
import { MemberCountPage } from "@/features/member-count/MemberCountPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<MemberCountPage />, {
		route: `/guilds/${GUILD}/member-count`,
		path: "/guilds/:guildId/member-count",
	});
}

describe("the member count page", () => {
	it("has no obvious accessibility problems", async () => {
		const { container } = renderPage();
		await screen.findByText(/people and bots/i);

		await expectNoViolations(container);
	});
});
