import { embed } from "@lib/embeds";
import { buildPage, pageCount } from "@lib/pagination";

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
