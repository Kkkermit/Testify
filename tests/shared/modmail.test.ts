import { messageChunks } from "@testify/shared";

describe("messageChunks", () => {
	/** Discord refuses a message over 2,000 characters, so a long direct message must arrive in pieces, not at all. */
	it("splits at a line break near the limit, and keeps every character but the break", () => {
		const text = `${"a".repeat(1_500)}\n${"b".repeat(1_000)}`;

		const chunks = messageChunks(text);

		expect(chunks).toEqual(["a".repeat(1_500), "b".repeat(1_000)]);
		expect(messageChunks("x".repeat(4_500)).map((chunk) => chunk.length)).toEqual([2_000, 2_000, 500]);
		expect(messageChunks("")).toEqual([""]);
	});
});
