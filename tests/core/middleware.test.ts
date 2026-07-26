import { PermissionFlagsBits } from "discord.js";
import { type SharedCommand } from "../../src/core/command";
import {
	clearCooldowns,
	cooldownMiddleware,
	guildOnlyMiddleware,
	ownerOnlyMiddleware,
	runMiddleware,
	underDevelopmentMiddleware,
} from "../../src/core/middleware";
import { Category } from "../../src/config/categories";
import { createMockContext } from "../helpers/context";

function command(overrides: Partial<SharedCommand> = {}): SharedCommand {
	return {
		name: "test",
		description: "test",
		category: Category.Fun,
		surfaces: ["slash"],
		execute: async () => undefined,
		...overrides,
	};
}

describe("guildOnlyMiddleware", () => {
	it("blocks a guild-only command in a DM", async () => {
		const result = await guildOnlyMiddleware(createMockContext({ guildId: null }), command({ guildOnly: true }));
		expect(result.ok).toBe(false);
	});

	it("allows a guild-only command inside a guild", async () => {
		const result = await guildOnlyMiddleware(createMockContext(), command({ guildOnly: true }));
		expect(result.ok).toBe(true);
	});

	// A DM-usable command that declared permissions used to crash here, because
	// the gate dereferenced a null member.
	it("does not crash for a DM-usable command that declares permissions", async () => {
		const ctx = createMockContext({ guildId: null });
		const result = await runMiddleware(ctx, command({ permissions: [PermissionFlagsBits.BanMembers] }), [
			guildOnlyMiddleware,
		]);
		expect(result.ok).toBe(true);
	});
});

describe("ownerOnlyMiddleware", () => {
	it("blocks a non-owner", async () => {
		const result = await ownerOnlyMiddleware(createMockContext({ userId: "555" }), command({ ownerOnly: true }));
		expect(result.ok).toBe(false);
	});

	// The previous check used `.includes()` against a single ID string, so any
	// substring of the developer ID passed.
	it("rejects a user id that is merely a substring of an owner id", async () => {
		const result = await ownerOnlyMiddleware(createMockContext({ userId: "1111" }), command({ ownerOnly: true }));
		expect(result.ok).toBe(false);
	});

	it("allows the configured owner", async () => {
		const result = await ownerOnlyMiddleware(
			createMockContext({ userId: "111111111111111111" }),
			command({ ownerOnly: true }),
		);
		expect(result.ok).toBe(true);
	});
});

describe("underDevelopmentMiddleware", () => {
	it("blocks a command flagged as under development", async () => {
		const result = await underDevelopmentMiddleware(createMockContext(), command({ underDevelopment: true }));
		expect(result.ok).toBe(false);
	});
});

describe("cooldownMiddleware", () => {
	beforeEach(() => clearCooldowns());

	it("allows the first call and blocks the second", async () => {
		const ctx = createMockContext({ userId: "cooldown-user" });
		const target = command({ cooldownMs: 60_000 });

		expect((await cooldownMiddleware(ctx, target)).ok).toBe(true);
		expect((await cooldownMiddleware(ctx, target)).ok).toBe(false);
	});

	it("tracks cooldowns per user", async () => {
		const target = command({ cooldownMs: 60_000 });
		await cooldownMiddleware(createMockContext({ userId: "a" }), target);

		expect((await cooldownMiddleware(createMockContext({ userId: "b" }), target)).ok).toBe(true);
	});

	it("exempts owners", async () => {
		const ctx = createMockContext({ userId: "111111111111111111" });
		const target = command({ cooldownMs: 60_000 });

		expect((await cooldownMiddleware(ctx, target)).ok).toBe(true);
		expect((await cooldownMiddleware(ctx, target)).ok).toBe(true);
	});

	it("ignores commands with no cooldown", async () => {
		const ctx = createMockContext();
		expect((await cooldownMiddleware(ctx, command())).ok).toBe(true);
		expect((await cooldownMiddleware(ctx, command())).ok).toBe(true);
	});
});

describe("runMiddleware", () => {
	it("short-circuits on the first failure", async () => {
		const later = jest.fn().mockResolvedValue({ ok: true });
		const result = await runMiddleware(createMockContext({ guildId: null }), command({ guildOnly: true }), [
			guildOnlyMiddleware,
			later,
		]);

		expect(result.ok).toBe(false);
		expect(later).not.toHaveBeenCalled();
	});
});
