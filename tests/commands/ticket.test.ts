import { PermissionFlagsBits, PermissionsBitField, type Role } from "discord.js";
import ticket from "@commands/tickets/ticket.command";
import { dispatch } from "@core/command";
import { getTicketSetup, saveTicketSetup } from "@database/repositories/ticketRepository";
import { createMockClient, createMockGuild, createMockInteraction, mockCollection } from "@tests/helpers/mocks";

jest.mock("@database/repositories/ticketRepository", () => ({
	getTicketSetup: jest.fn(() => Promise.resolve(null)),
	saveTicketSetup: jest.fn(() => Promise.resolve({})),
}));

const QUIET = { id: "300000000000000004", name: "Staff", mentionable: false } as Role;

function settingUp(granted: bigint[]): Promise<void> {
	const guild = createMockGuild();
	const interaction = createMockInteraction({
		subcommand: "setup",
		options: { "staff-role": QUIET },
		overrides: {
			guild: { ...guild, roles: { ...guild.roles, cache: mockCollection([[QUIET.id, QUIET]]) } },
			memberPermissions: new PermissionsBitField(granted),
		} as never,
	});

	return dispatch(interaction, ticket, createMockClient());
}

/** Every ticket that opens pings the staff role, so Manage Server alone could ping a role nobody may ping. */
it("takes a staff role members cannot ping only from somebody with Mention Everyone, unless it already is", async () => {
	await expect(settingUp([PermissionFlagsBits.ManageGuild])).rejects.toThrow(/Mention Everyone/);

	jest.mocked(getTicketSetup).mockResolvedValue({ handlerRoleId: QUIET.id } as never);
	await expect(settingUp([PermissionFlagsBits.ManageGuild])).rejects.toThrow(/channel I can post the panel in/);
	expect(saveTicketSetup).not.toHaveBeenCalled();
});
