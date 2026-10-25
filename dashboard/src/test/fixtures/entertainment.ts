import { type GiveawayList, type MusicSettings } from "@testify/shared";

/** Typed against the shared contract, so a fixture cannot drift from what the API actually returns. */

export const musicSettings: MusicSettings = {
	enabled: true,
	djRoleIds: [],
	configured: true,
};

export const giveawayList: GiveawayList = {
	giveaways: [
		{
			messageId: "700000000000000001",
			channelId: "400000000000000001",
			prize: "A copy of the game",
			winnerCount: 2,
			startAt: "2026-08-09T10:00:00.000Z",
			endAt: "2026-08-11T10:00:00.000Z",
			ended: false,
			winners: [],
			hostedBy: "100000000000000001",
		},
		{
			messageId: "700000000000000002",
			channelId: "400000000000000001",
			prize: "Server boost",
			winnerCount: 1,
			startAt: "2026-08-01T10:00:00.000Z",
			endAt: "2026-08-02T10:00:00.000Z",
			ended: true,
			winners: [{ id: "100000000000000002", tag: "winner#0001" }],
			hostedBy: "100000000000000001",
		},
	],
};
