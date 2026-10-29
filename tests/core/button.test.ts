import { customId } from "@core/button";

describe("customId", () => {
	it("refuses a part containing the separator, which would break parsing", () => {
		expect(() => customId("shop", "buy:now")).toThrow(/cannot contain/);
	});

	it("refuses an ID Discord would reject", () => {
		expect(() => customId("shop", "buy", "x".repeat(120))).toThrow(/too long/);
	});
});
