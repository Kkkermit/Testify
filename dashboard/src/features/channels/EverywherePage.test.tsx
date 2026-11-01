import { screen } from "@testing-library/react";
import { EverywherePage } from "@/features/channels/EverywherePage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";

const GUILD = "900000000000000001";

describe("the Everywhere page", () => {
	it("lists the features that belong to no one channel, and nothing placed in one", async () => {
		const { container } = renderWithProviders(<EverywherePage />, {
			route: `/guilds/${GUILD}/everywhere`,
			path: "/guilds/:guildId/everywhere",
		});

		expect(await screen.findByRole("link", { name: /Levelling/ })).toHaveAttribute(
			"href",
			`/guilds/${GUILD}/levelling`,
		);
		expect(screen.queryByRole("link", { name: /Welcome/ })).toBeNull();
		expect(screen.queryByRole("link", { name: /Tickets/ })).toBeNull();
		await expectNoViolations(container);
	});
});
