import { removeAccess } from "@database/repositories/dashboardAccessRepository";
import handler from "@events/create/guildMemberRemove.event";
import { forgetLeaver } from "@lib/birthdays";
import { trackLeave } from "@lib/invites";
import { sendGoodbye } from "@lib/welcome";
import { createMockClient, createMockMember, GUILD_ID } from "@tests/helpers/mocks";

jest.mock("@database/repositories/dashboardAccessRepository", () => ({ removeAccess: jest.fn() }));
jest.mock("@lib/birthdays", () => ({ forgetLeaver: jest.fn() }));
jest.mock("@lib/info", () => ({ countMove: jest.fn() }));
jest.mock("@lib/invites", () => ({ trackLeave: jest.fn() }));
jest.mock("@lib/moderation", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@lib/settings", () => ({ syncVoiceCounters: jest.fn() }));
jest.mock("@lib/welcome", () => ({ sendGoodbye: jest.fn() }));

describe("a member leaving", () => {
	/** A goodbye that threw ended the handler, so the leaver kept their dashboard access and their shared birthday. */
	it("forgets their access and birthday even when the goodbye fails", async () => {
		jest.mocked(sendGoodbye).mockRejectedValueOnce(new Error("database away"));
		const error = jest.fn();
		const member = createMockMember({ guild: { id: GUILD_ID, memberCount: 9 } as never });

		await handler.run(createMockClient({ logger: { error } } as never), member);

		expect(removeAccess).toHaveBeenCalledWith(GUILD_ID, member.id);
		expect(forgetLeaver).toHaveBeenCalledWith(GUILD_ID, member.id);
		expect(trackLeave).toHaveBeenCalled();
		expect(error).toHaveBeenCalledWith(expect.objectContaining({ step: "goodbye" }), expect.any(String));
	});
});
