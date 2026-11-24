import deleted from "@events/logging/messageAudit.event";
import edited from "@events/logging/messageUpdateAudit.event";
import { writeAuditLog } from "@lib/moderation";
import { createMockClient, createMockUser } from "@tests/helpers/mocks";

jest.mock("@lib/moderation", () => ({ writeAuditLog: jest.fn() }));

const written = jest.mocked(writeAuditLog);

function message(content: string | null): never {
	return { guild: { id: "1" }, author: createMockUser(), channelId: "2", content } as never;
}

function fieldValues(): string[] {
	return (written.mock.calls[0]?.[2].fields ?? []).map((field) => field.value);
}

beforeEach(() => jest.clearAllMocks());

/** Discord refuses a field with no text, so a deleted or edited picture-only message was never logged. */
describe("the message audit entries", () => {
	it("gives a deleted message with no text, or none cached, a field Discord accepts", async () => {
		await deleted.run(createMockClient(), message(""));
		await deleted.run(createMockClient(), message(null));

		expect(fieldValues()).toContain("*No text.*");
		expect(fieldValues().every((value) => value !== "")).toBe(true);
		expect(written.mock.calls[1]?.[2].fields?.map((field) => field.value)).toContain("*Not cached.*");
	});

	it("gives an edit that added text to a picture a Before that is not empty", async () => {
		await edited.run(createMockClient(), message(""), message("now with words"));

		expect(fieldValues()).toEqual(expect.arrayContaining(["*No text.*", "now with words"]));
	});
});
