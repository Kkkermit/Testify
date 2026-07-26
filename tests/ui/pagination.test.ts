import { Namespace } from "../../src/core/customId";
import { embed } from "../../src/ui/embeds";
import { buildPage, pageCount } from "../../src/ui/pagination";

const items = Array.from({ length: 23 }, (_, index) => index);
const render = (page: number[]) => embed({ description: page.join(",") });

describe("pageCount", () => {
	it("rounds up", () => {
		expect(pageCount(23, 10)).toBe(3);
		expect(pageCount(20, 10)).toBe(2);
	});

	it("never returns zero", () => {
		expect(pageCount(0, 10)).toBe(1);
	});
});

describe("buildPage", () => {
	const options = { items, pageSize: 10, namespace: Namespace.Inventory, ownerId: "42", render };

	it("slices the requested page", () => {
		expect(buildPage(options, 1).embeds[0]!.toJSON().description).toContain("10,11");
	});

	it("clamps a page beyond the end", () => {
		const page = buildPage(options, 99).embeds[0]!.toJSON();
		expect(page.description).toContain("20,21,22");
	});

	it("clamps a negative page", () => {
		expect(buildPage(options, -5).embeds[0]!.toJSON().description).toContain("0,1,2");
	});

	it("omits navigation for a single page", () => {
		expect(buildPage({ ...options, items: [1, 2] }, 0).components).toHaveLength(0);
	});

	// Page state lives entirely in the custom ID, so nothing is held server-side.
	it("encodes the page and owner into the navigation ids", () => {
		const [row] = buildPage({ ...options, key: "user-1" }, 1).components;
		const ids = row!.toJSON().components.map((component) => (component as { custom_id: string }).custom_id);

		expect(ids[0]).toBe("inv:goto:user-1:0:42");
		expect(ids.at(-1)).toBe("inv:goto:user-1:2:42");
	});

	it("disables the back controls on the first page", () => {
		const [row] = buildPage(options, 0).components;
		const components = row!.toJSON().components as { disabled?: boolean }[];
		expect(components[0]!.disabled).toBe(true);
		expect(components[4]!.disabled).toBe(false);
	});
});
