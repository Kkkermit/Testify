import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { ChannelNav } from "@/app/layout/ChannelNav";
import { DRAG_FEATURE, dragKindType } from "@/features/channels/placement";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function capture(): () => unknown[] {
	const bodies: unknown[] = [];
	server.use(
		http.patch(`/api/guilds/${GUILD}/welcome`, async ({ request }) => {
			bodies.push(await request.json());
			return HttpResponse.json({});
		}),
	);
	return () => bodies;
}

/** A drag carries the feature in its data and the kind of channel it takes in its type, as the overview's chips set them. */
function dragOf(feature: string, kind: "text" | "voice"): { dataTransfer: Partial<DataTransfer> } {
	return {
		dataTransfer: {
			types: [DRAG_FEATURE, dragKindType(kind)],
			getData: (type: string) => (type === DRAG_FEATURE ? feature : ""),
			dropEffect: "none",
		},
	};
}

describe("dropping a feature on a channel", () => {
	it("starts it there through the feature's own route", async () => {
		const sent = capture();
		renderWithProviders(<ChannelNav guildId={GUILD} expanded />, {
			path: "/guilds/:guildId",
			route: `/guilds/${GUILD}`,
		});
		const channels = await screen.findByRole("list", { name: "Channels" });
		const general = within(channels)
			.getByRole("link", { name: /general/ })
			.closest("li") as HTMLElement;

		fireEvent.dragOver(general, dragOf("welcome", "text"));
		fireEvent.drop(general, dragOf("welcome", "text"));

		await waitFor(() => {
			expect(sent()).toEqual([{ channelId: "400000000000000001", enabled: true }]);
		});
	});

	/** The bot cannot post in #locked, and a voice channel cannot take a message, so neither drop sends anything. */
	it("refuses a channel that cannot take what was dropped", async () => {
		const sent = capture();
		renderWithProviders(<ChannelNav guildId={GUILD} expanded />, {
			path: "/guilds/:guildId",
			route: `/guilds/${GUILD}`,
		});
		const channels = await screen.findByRole("list", { name: "Channels" });

		for (const name of [/locked/, /Voice/]) {
			const row = within(channels).getByRole("link", { name }).closest("li") as HTMLElement;
			fireEvent.drop(row, dragOf("welcome", "text"));
		}

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(sent()).toEqual([]);
	});
});
