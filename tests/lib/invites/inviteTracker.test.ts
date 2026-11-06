import { Collection, PermissionsBitField } from "discord.js";
import { getInviteSettings, recordJoin } from "@database/repositories/inviteRepository";
import { primeInvites, trackJoin } from "@lib/invites/inviteTracker.util";

jest.mock("@database/repositories/inviteRepository", () => ({
	getInviteSettings: jest.fn(),
	markLeft: jest.fn(() => Promise.resolve()),
	recordJoin: jest.fn(() => Promise.resolve()),
	standingOf: jest.fn(() => Promise.resolve({ joins: 3, left: 1 })),
}));

const GUILD = "900000000000000001";
const LOG = "400000000000000009";

function invite(code: string, uses: number, inviterId = "100000000000000001") {
	return [code, { code, uses, inviterId, inviter: { username: "kermit" } }] as const;
}

function world(uses: { abc: number; def: number }[]) {
	const channel = { isSendable: () => true, send: jest.fn(() => Promise.resolve()) };
	let read = 0;
	const guild = {
		id: GUILD,
		vanityURLCode: null,
		members: { me: { permissions: new PermissionsBitField(PermissionsBitField.Flags.ManageGuild) } },
		invites: {
			fetch: jest.fn(() => {
				const counts = uses[Math.min(read, uses.length - 1)] ?? { abc: 0, def: 0 };
				read += 1;
				return Promise.resolve(
					new Collection([invite("abc", counts.abc), invite("def", counts.def, "100000000000000003")]),
				);
			}),
		},
		channels: { fetch: jest.fn(() => Promise.resolve(channel)) },
	};
	const member = { id: "100000000000000002", guild, user: { username: "kate", bot: false }, toString: () => "<@2>" };
	const client = { logger: { warn: jest.fn(), debug: jest.fn() } };

	return { guild: guild as never, member: member as never, client: client as never, channel };
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getInviteSettings).mockResolvedValue({ enabled: true, logChannelId: LOG });
});

describe("trackJoin", () => {
	it("credits the invite whose uses went up, and announces it without pinging", async () => {
		const { guild, member, client, channel } = world([
			{ abc: 3, def: 1 },
			{ abc: 4, def: 1 },
		]);
		await primeInvites(guild);

		await trackJoin(client, member);

		expect(recordJoin).toHaveBeenCalledWith(
			expect.objectContaining({ memberId: "100000000000000002", inviterId: "100000000000000001", code: "abc" }),
		);
		expect(channel.send).toHaveBeenCalledWith(expect.objectContaining({ allowedMentions: { parse: [] } }));
	});

	/** After a restart nothing has been seen to compare with, so the join is recorded as unknown rather than guessed. */
	it("records an unknown invite when there was nothing to compare against", async () => {
		const { member, client } = world([{ abc: 4, def: 1 }]);

		await trackJoin(client, member);

		expect(recordJoin).toHaveBeenCalledWith(expect.objectContaining({ inviterId: null, code: null }));
	});

	it("records nothing while tracking is off, or for a bot", async () => {
		const { member, client } = world([{ abc: 1, def: 1 }]);
		jest.mocked(getInviteSettings).mockResolvedValueOnce({ enabled: false, logChannelId: null });

		await trackJoin(client, member);
		await trackJoin(client, { ...(member as object), user: { username: "bot", bot: true } } as never);

		expect(recordJoin).not.toHaveBeenCalled();
	});
});
