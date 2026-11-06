import { type AccessActivity, type AccessPerson } from "@testify/shared";

export const helper: AccessPerson = {
	userId: "100000000000000031",
	username: "helper",
	avatarUrl: null,
	inServer: true,
	areas: ["warnings", "bans"],
	addedBy: { id: "100000000000000001", name: "someone" },
	addedAt: "2026-11-01T10:00:00.000Z",
	updatedAt: "2026-11-02T10:00:00.000Z",
	lastSeenAt: "2026-11-05T09:00:00.000Z",
	lastChangeAt: "2026-11-05T09:05:00.000Z",
	changes: 3,
};

export const helperActivity: AccessActivity = {
	person: helper,
	items: [{ actorTag: "helper", action: "member.unban", summary: "Unbanned spammer", at: "2026-11-05T09:05:00.000Z" }],
};
