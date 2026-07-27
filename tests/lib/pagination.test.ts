import { type EmbedBuilder } from "discord.js";
import { embed } from "@lib/embeds.util";
import { buildPage, pageCount, paginatedButton } from "@lib/pagination.util";
import { GUILD_ID, OWNER_ID } from "@tests/helpers/mocks";

const OWNER = "111111111111111111";
const items = Array.from({ length: 25 }, (_unused, index) => index);

function render(page: number[]): ReturnType<typeof embed> {
	return embed({ description: page.join(",") });
}

describe("pageCount", () => {
	it.each([
		[0, 10, 1],
		[10, 10, 1],
		[11, 10, 2],
		[25, 10, 3],
	])("%i items at %i per page is %i pages", (total, size, expected) => {
		expect(pageCount(total, size)).toBe(expected);
	});
});

describe("buildPage", () => {
	it("slices the requested page", () => {
		const page = buildPage({ items, pageSize: 10, id: "test", ownerId: OWNER, render }, 1);
		expect(page.embeds[0]?.data.description).toBe("10,11,12,13,14,15,16,17,18,19");
	});

	it("clamps a page number past the end", () => {
		const page = buildPage({ items, pageSize: 10, id: "test", ownerId: OWNER, render }, 99);
		expect(page.embeds[0]?.data.description).toBe("20,21,22,23,24");
	});

	it("clamps a negative page number", () => {
		const page = buildPage({ items, pageSize: 10, id: "test", ownerId: OWNER, render }, -5);
		expect(page.embeds[0]?.data.description).toBe("0,1,2,3,4,5,6,7,8,9");
	});

	it("leaves out the arrows when everything fits on one page", () => {
		const page = buildPage({ items: [1, 2], pageSize: 10, id: "test", ownerId: OWNER, render });
		expect(page.components).toEqual([]);
	});

	it("shows the arrows when there is more than one page", () => {
		const page = buildPage({ items, pageSize: 10, id: "test", ownerId: OWNER, render });
		expect(page.components).toHaveLength(1);
	});
});

describe("paginatedButton", () => {
	const render = (items: string[], page: number, total: number): EmbedBuilder =>
		embed({ category: "info", title: `Page ${page + 1}/${total}`, description: items.join(", ") || "empty" });

	interface FakeComponent {
		update: jest.Mock<Promise<void>, [{ embeds: EmbedBuilder[] }]>;
	}

	function componentInteraction(args: string[], overrides: Record<string, unknown> = {}): FakeComponent {
		return {
			user: { id: OWNER_ID },
			guildId: GUILD_ID,
			customId: ["list", "goto", ...args].join(":"),
			isMessageComponent: () => true,
			update: jest.fn(() => Promise.resolve()),
			...overrides,
		} as unknown as FakeComponent;
	}

	const button = (resolve: jest.Mock): ReturnType<typeof paginatedButton<string>> =>
		paginatedButton<string>({ id: "list", pageSize: 2, resolve, render });

	it("is owner-only, so one person's buttons are not another's", () => {
		expect(button(jest.fn()).ownerOnly).toBe(true);
	});

	it("rebuilds the page from the key in the custom ID", async () => {
		const resolve = jest.fn(() => Promise.resolve(["a", "b", "c", "d"]));
		const interaction = componentInteraction(["mykey", "1", OWNER_ID]);

		await button(resolve).run(interaction as never, {
			action: "goto",
			args: ["mykey", "1", OWNER_ID],
			client: {} as never,
		});

		expect(resolve).toHaveBeenCalledWith("mykey", expect.objectContaining({ guildId: GUILD_ID, userId: OWNER_ID }));
		expect(interaction.update).toHaveBeenCalled();
	});

	it("ignores an action that is not navigation", async () => {
		const resolve = jest.fn();
		const interaction = componentInteraction(["k", "0", OWNER_ID]);

		await button(resolve).run(interaction as never, { action: "other", args: [], client: {} as never });

		expect(resolve).not.toHaveBeenCalled();
	});

	it("ignores an interaction that is not a message component", async () => {
		const resolve = jest.fn();
		const interaction = componentInteraction(["k", "0", OWNER_ID], { isMessageComponent: () => false });

		await button(resolve).run(interaction as never, { action: "goto", args: [], client: {} as never });

		expect(resolve).not.toHaveBeenCalled();
	});

	/** A tampered or truncated custom ID must land on page one, not crash. */
	it("falls back to the first page when the page number is not a number", async () => {
		const resolve = jest.fn(() => Promise.resolve(["a", "b", "c", "d"]));
		const interaction = componentInteraction(["k", "notanumber", OWNER_ID]);

		await button(resolve).run(interaction as never, {
			action: "goto",
			args: ["k", "notanumber", OWNER_ID],
			client: {} as never,
		});

		expect(interaction.update.mock.calls[0]?.[0].embeds[0]?.toJSON().title).toBe("Page 1/2");
	});

	it("copes with a custom ID carrying no arguments at all", async () => {
		const resolve = jest.fn(() => Promise.resolve([]));
		const interaction = componentInteraction([]);

		await expect(
			button(resolve).run(interaction as never, { action: "goto", args: [], client: {} as never }),
		).resolves.toBeUndefined();
	});
});
