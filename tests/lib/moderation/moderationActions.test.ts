import { type GuildMember } from "discord.js";
import { type CommandInput } from "@core/command";
import { UserFacingError } from "@core/errors";
import { assertModeratable, dmEmbed, notifyTarget } from "@lib/moderation/moderationActions.util";
import {
	BOT_ID,
	createMockGuild,
	createMockInteraction,
	createMockMember,
	createMockUser,
	GUILD_ID,
	OWNER_ID,
	USER_ID,
} from "@tests/helpers/mocks";

/** A member at a given role height, in a guild whose owner and bot are configurable. */
function scene(options: {
	moderatorPosition?: number;
	targetPosition?: number;
	botPosition?: number;
	moderatorId?: string;
	targetId?: string;
	guildOwnerId?: string;
}): { ctx: CommandInput; target: GuildMember } {
	const {
		moderatorPosition = 10,
		targetPosition = 5,
		botPosition = 20,
		moderatorId = USER_ID,
		targetId = "900000000000000009",
		guildOwnerId = OWNER_ID,
	} = options;

	// `asMember()` needs `guild`, or the hierarchy checks are never reached.
	const at = (position: number, id: string, guild: unknown): GuildMember =>
		createMockMember({ id, guild, roles: { highest: { position } } } as never);

	const guild = createMockGuild({ ownerId: guildOwnerId });
	(guild as { members: unknown }).members = { me: at(botPosition, BOT_ID, guild) };

	const target = at(targetPosition, targetId, guild);

	const ctx = createMockInteraction({
		overrides: {
			user: createMockUser({ id: moderatorId }),
			member: at(moderatorPosition, moderatorId, guild),
			guild,
			client: { user: { id: BOT_ID } },
		} as never,
	}) as unknown as CommandInput;

	return { ctx, target };
}

describe("assertModeratable", () => {
	it("refuses self-moderation", () => {
		const { ctx, target } = scene({ targetId: USER_ID });
		expect(() => assertModeratable(ctx, target)).toThrow(UserFacingError);
	});

	it("refuses to moderate the bot itself", () => {
		const { ctx, target } = scene({ targetId: BOT_ID });
		expect(() => assertModeratable(ctx, target)).toThrow(UserFacingError);
	});

	it("refuses to moderate the server owner", () => {
		const { ctx, target } = scene({ targetId: GUILD_ID, guildOwnerId: GUILD_ID });
		expect(() => assertModeratable(ctx, target)).toThrow(/server owner/i);
	});

	it("refuses when the target outranks the moderator", () => {
		const { ctx, target } = scene({ moderatorPosition: 3, targetPosition: 9 });
		expect(() => assertModeratable(ctx, target)).toThrow(UserFacingError);
	});

	it("refuses on an equal role, since Discord will not allow it either", () => {
		const { ctx, target } = scene({ moderatorPosition: 5, targetPosition: 5 });
		expect(() => assertModeratable(ctx, target)).toThrow(UserFacingError);
	});

	/** The owner outranks everyone regardless of where their role sits. */
	it("lets the server owner moderate someone above them", () => {
		const { ctx, target } = scene({ moderatorId: OWNER_ID, moderatorPosition: 1, targetPosition: 9 });
		expect(() => assertModeratable(ctx, target)).not.toThrow();
	});

	/** Skipping this is what produced raw API errors in the JavaScript commands. */
	it("refuses when the bot itself is not high enough", () => {
		const { ctx, target } = scene({ moderatorPosition: 30, targetPosition: 20, botPosition: 10 });
		expect(() => assertModeratable(ctx, target)).toThrow(UserFacingError);
	});
});

describe("notifyTarget", () => {
	/** Closed DMs are normal, not an error the command should fail on. */
	it("reports failure rather than throwing when DMs are closed", async () => {
		const user = createMockUser({ send: jest.fn(() => Promise.reject(new Error("Cannot send messages"))) });
		await expect(notifyTarget(user, {} as never)).resolves.toBe(false);
	});
});

describe("dmEmbed", () => {
	const base = {
		action: "banned from Test Server",
		emoji: "🔨",
		guild: createMockGuild(),
		moderator: createMockUser({ username: "mod" }),
		reason: "spamming",
	};

	/** The recipient already knows who they are; they need to know where and why. */
	it("names the server and the reason, not the recipient", () => {
		const data = dmEmbed(base).toJSON();

		expect(data.fields?.map((field) => field.name)).toEqual(["Server", "Moderator", "Reason"]);
		expect(JSON.stringify(data)).toContain("spamming");
	});
});
