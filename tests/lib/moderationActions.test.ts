import { type GuildMember } from "discord.js";
import { type CommandInput } from "@core/command";
import { UserFacingError } from "@core/errors";
import { actionEmbed, assertModeratable, DEFAULT_REASON, dmEmbed, notifyTarget } from "@lib/moderationActions.util";
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

	// `asMember()` identifies a guild member by the presence of `guild`, so every
	// member here needs one or the hierarchy checks are never reached.
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
	it("allows a moderator above the target", () => {
		const { ctx, target } = scene({});
		expect(() => assertModeratable(ctx, target)).not.toThrow();
	});

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
	it("reports success when the DM lands", async () => {
		const user = createMockUser();
		await expect(notifyTarget(user, {} as never)).resolves.toBe(true);
	});

	/** Closed DMs are normal, not an error the command should fail on. */
	it("reports failure rather than throwing when DMs are closed", async () => {
		const user = createMockUser({ send: jest.fn(() => Promise.reject(new Error("Cannot send messages"))) });
		await expect(notifyTarget(user, {} as never)).resolves.toBe(false);
	});
});

describe("actionEmbed", () => {
	const base = {
		action: "Member banned",
		emoji: "🔨",
		guild: createMockGuild(),
		target: createMockUser(),
		moderator: createMockUser({ id: OWNER_ID, username: "mod" }),
		reason: DEFAULT_REASON,
	};

	it("names the action and lists user, moderator and reason", () => {
		const data = actionEmbed(base).toJSON();

		expect(data.title).toContain("Member banned");
		expect(data.fields?.map((field) => field.name)).toEqual(["User", "Moderator", "Reason"]);
	});

	it("includes the target's ID, so the record survives a rename", () => {
		expect(JSON.stringify(actionEmbed(base).toJSON())).toContain(USER_ID);
	});

	it("appends any extra fields after the standard ones", () => {
		const data = actionEmbed({ ...base, extra: [{ name: "Warning ID", value: "abc" }] }).toJSON();

		expect(data.fields?.at(-1)).toMatchObject({ name: "Warning ID", value: "abc" });
	});

	it("falls back to a stated default reason", () => {
		expect(JSON.stringify(actionEmbed(base).toJSON())).toContain("No reason provided");
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

	it("addresses the recipient directly", () => {
		expect(dmEmbed(base).toJSON().title).toContain("You were");
	});

	/** The recipient already knows who they are; they need to know where and why. */
	it("names the server and the reason, not the recipient", () => {
		const data = dmEmbed(base).toJSON();

		expect(data.fields?.map((field) => field.name)).toEqual(["Server", "Moderator", "Reason"]);
		expect(JSON.stringify(data)).toContain("spamming");
	});

	it("appends extra fields", () => {
		const data = dmEmbed({ ...base, extra: [{ name: "Expires", value: "in 3 days" }] }).toJSON();
		expect(data.fields?.at(-1)).toMatchObject({ name: "Expires" });
	});
});
