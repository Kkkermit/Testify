import { LIMITS } from "../../src/config/constants";
import { decodeId, encodeId, isNamespace, Namespace } from "../../src/core/customId";

describe("customId codec", () => {
	it("round-trips a namespace, action and arguments", () => {
		const id = encodeId(Namespace.Shop, "buy", "item_42", 7);
		expect(id).toBe("shop:buy:item_42:7");
		expect(decodeId(id)).toEqual({ ns: "shop", action: "buy", args: ["item_42", "7"] });
	});

	it("decodes an id with no arguments", () => {
		expect(decodeId("help:category")).toEqual({ ns: "help", action: "category", args: [] });
	});

	it("decodes junk without throwing", () => {
		expect(decodeId("")).toEqual({ ns: "", action: "", args: [] });
		expect(decodeId("only-a-namespace")).toEqual({ ns: "only-a-namespace", action: "", args: [] });
	});

	it("rejects segments containing the separator", () => {
		expect(() => encodeId(Namespace.Shop, "buy", "a:b")).toThrow(/must not contain/);
	});

	// Several previous IDs interpolated multiple snowflakes and nothing guarded
	// Discord's limit, so the whole message was rejected at send time.
	it("rejects ids over Discord's character limit", () => {
		const long = "9".repeat(30);
		expect(() => encodeId(Namespace.ModPanel, "action", long, long, long, long)).toThrow(
			new RegExp(String(LIMITS.customIdLength)),
		);
	});

	it("recognises only registered namespaces", () => {
		expect(isNamespace("shop")).toBe(true);
		expect(isNamespace("back-")).toBe(false);
	});
});
