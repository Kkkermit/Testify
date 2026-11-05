import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { PlaceIn } from "@/features/channels/components/PlaceIn";
import { guildPlaces, someChannels } from "@/test/fixtures/server";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";
const goodbye = guildPlaces.features.find((feature) => feature.key === "goodbye");

describe("Place in", () => {
	/** It is the keyboard's way to do what a drag does, so it offers exactly the channels a drop would take. */
	it("offers only channels the bot can post in, and places the feature in the one chosen", async () => {
		const user = userEvent.setup();
		const bodies: unknown[] = [];
		server.use(
			http.patch(`/api/guilds/${GUILD}/goodbye`, async ({ request }) => {
				bodies.push(await request.json());
				return HttpResponse.json({});
			}),
		);
		renderWithProviders(<PlaceIn feature={goodbye!} channels={someChannels} guildId={GUILD} />, {
			path: "/guilds/:guildId",
			route: `/guilds/${GUILD}`,
		});

		await user.click(screen.getByRole("button", { name: "Place Goodbye in a channel" }));

		expect(screen.queryByRole("button", { name: "#locked" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Voice" })).toBeNull();
		await user.click(screen.getByRole("button", { name: "#general" }));
		await waitFor(() => {
			expect(bodies).toEqual([{ channelId: "400000000000000001", enabled: true }]);
		});
	});
});
