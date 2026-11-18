import { awardXp } from "@database/repositories/levelRepository";
import { getTuning } from "@database/repositories/tuningRepository";
import handler from "@events/message/levelling.event";
import { DEFAULT_TUNING } from "@testify/shared";
import { createMockClient, createMockMessage, mockCollection } from "@tests/helpers/mocks";

jest.mock("node:crypto", () => ({ ...jest.requireActual<object>("node:crypto"), randomInt: () => 10 }));
jest.mock("@database/repositories/levelRepository", () => ({
	awardXp: jest.fn(() => Promise.resolve(null)),
	getLevelSettings: jest.fn(() => Promise.resolve({ enabled: true })),
}));
jest.mock("@database/repositories/tuningRepository", () => ({ getTuning: jest.fn() }));

describe("the levelling message handler", () => {
	/** A server that halves XP and lengthens the cooldown must have both applied to the very next message. */
	it("awards XP at the server's rate and with its cooldown", async () => {
		jest.mocked(getTuning).mockResolvedValue({ ...DEFAULT_TUNING, xpRate: 50, xpCooldownSeconds: 120 });
		const message = createMockMessage({
			content: "hello",
			overrides: { member: { roles: { cache: mockCollection([]) } } } as never,
		});

		await handler.run(message, createMockClient());

		expect(awardXp).toHaveBeenCalledWith(expect.any(String), expect.any(String), 5, 120_000);
	});
});
