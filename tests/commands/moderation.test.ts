import nickname from "@commands/moderation/nickname.command";
import unmute from "@commands/moderation/unmute.command";
import automod from "@commands/settings/automod.command";
import { type Command } from "@core/command";
import { UserFacingError } from "@core/errors";
import { listAutomodRules, removeTimeout } from "@lib/moderation";
import {
	createMockClient,
	createMockGuild,
	createMockInteraction,
	createMockMember,
	createMockUser,
	mockCollection,
} from "@tests/helpers/mocks";

jest.mock("@lib/moderation", () => ({
	...jest.requireActual<object>("@lib/moderation"),
	removeTimeout: jest.fn(() => Promise.resolve({ notified: false })),
	listAutomodRules: jest.fn(() =>
		Promise.resolve([
			{ id: "900000000000000001", name: "Blocked words", trigger: "Flagged words" },
			{ id: "900000000000000002", name: "Spam", trigger: "Spam" },
		]),
	),
}));

const TARGET = createMockUser({ id: "300000000000000003", username: "senior" });

/** A moderator ranked below somebody, which Discord itself refuses them for. */
function outranked() {
	const setNickname = jest.fn();
	const above = createMockMember({
		id: TARGET.id,
		user: TARGET,
		roles: { highest: { position: 8 }, cache: mockCollection() },
		setNickname,
	} as never);
	const bot = createMockMember({ id: "700000000000000007", roles: { highest: { position: 20 } } } as never);
	const guild = createMockGuild({ members: { fetch: jest.fn(() => Promise.resolve(above)), me: bot } } as never);
	Object.assign(above, { guild });

	const interaction = createMockInteraction({
		options: { user: TARGET, nickname: "Junior" },
		overrides: { guild, member: createMockMember({ guild, roles: { highest: { position: 3 } } } as never) },
	});
	return { interaction, setNickname };
}

/** `/nickname` and `/unmute` reached people ranked above the moderator, which the dashboard and Discord both refuse. */
it("refuses a member ranked above the moderator before changing anything", async () => {
	const commands: [name: string, command: Command][] = [
		["nickname", nickname],
		["unmute", unmute],
	];

	const reached: string[] = [];
	for (const [name, command] of commands) {
		const { interaction, setNickname } = outranked();
		await expect(command.run?.(interaction, createMockClient())).rejects.toBeInstanceOf(UserFacingError);
		if (setNickname.mock.calls.length > 0 || jest.mocked(removeTimeout).mock.calls.length > 0) reached.push(name);
	}

	expect(reached).toEqual([]);
});

/** `/automod delete` asked for a rule's ID, which `/automod list` never shows, so no rule could be deleted with it. */
it("offers the server's rules by name when deleting one", async () => {
	const respond = jest.fn();
	const interaction = { guild: {}, options: { getFocused: () => "blocked" }, respond };

	await automod.autocomplete?.(interaction as never, createMockClient());

	expect(listAutomodRules).toHaveBeenCalled();
	expect(respond).toHaveBeenCalledWith([{ name: "Blocked words · Flagged words", value: "900000000000000001" }]);
	expect(automod.subcommands?.find((sub) => sub.name === "delete")?.options?.[0]?.autocomplete).toBe(true);
});
