import { customId, parseCustomId } from "@core/button";

describe("customId", () => {
	it("joins the parts with colons", () => {
		expect(customId("shop", "buy", "item_42")).toBe("shop:buy:item_42");
	});

	it("accepts numbers", () => {
		expect(customId("help", "goto", 3)).toBe("help:goto:3");
	});

	it("refuses a part containing the separator, which would break parsing", () => {
		expect(() => customId("shop", "buy:now")).toThrow(/cannot contain/);
	});

	it("refuses an ID Discord would reject", () => {
		expect(() => customId("shop", "buy", "x".repeat(120))).toThrow(/too long/);
	});
});

describe("parseCustomId", () => {
	it("splits into id, action and arguments", () => {
		expect(parseCustomId("shop:buy:item_42:123")).toEqual({ id: "shop", action: "buy", args: ["item_42", "123"] });
	});

	it("copes with an ID that has no arguments", () => {
		expect(parseCustomId("help")).toEqual({ id: "help", action: "", args: [] });
	});

	it("round-trips whatever customId built", () => {
		const built = customId("inventory", "goto", "-", 2, "111111111111111111");
		expect(parseCustomId(built)).toEqual({
			id: "inventory",
			action: "goto",
			args: ["-", "2", "111111111111111111"],
		});
	});
});
