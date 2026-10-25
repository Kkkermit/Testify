import { MessageFlags, StringSelectMenuOptionBuilder, type TextChannel } from "discord.js";
import { strings } from "@config/strings";
import { customId, defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { getTicketByChannel, getTicketSetup } from "@database/repositories/ticketRepository";
import { embed, select, selectRow, successEmbed } from "@lib/discord";
import {
	claimTicketFor,
	closeTicket,
	lockTicket,
	memberCandidates,
	openTicket,
	TICKET_ID,
	toggleTicketMember,
} from "@lib/tickets";

export default defineButton({
	id: TICKET_ID,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (!guild) throw new UserFacingError(strings.generic.guildOnly);

		const setup = await getTicketSetup(guild.id);
		if (!setup) throw new UserFacingError("The ticket system is not configured in this server.");

		// The panel button is pressed outside any ticket, so it runs before the checks every other action needs.
		if (context.action === "open") {
			if (!interaction.isButton()) return;

			const channel = await openTicket(guild, setup, interaction.user);
			await interaction.reply({
				embeds: [successEmbed(`${strings.ticket.created} ${channel.toString()}`)],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const ticket = await getTicketByChannel(interaction.channelId ?? "");
		if (!ticket) throw new UserFacingError("This is not a ticket channel.");

		const channel = interaction.channel as TextChannel | null;
		if (!channel) throw new UserFacingError(strings.ticket.error);

		const member = await guild.members.fetch(interaction.user.id).catch(() => null);
		const isHandler = member?.roles.cache.has(setup.handlerRoleId) === true;

		if (!isHandler && ticket.ownerId !== interaction.user.id) {
			throw new UserFacingError(strings.ticket.noPermissions);
		}

		// Only the handler role may act on somebody else's ticket; the owner gets close and nothing more.
		const requireHandler = (): void => {
			if (!isHandler) throw new UserFacingError(strings.ticket.noPermissions);
		};

		switch (context.action) {
			case "lock":
			case "unlock": {
				requireHandler();
				const locking = context.action === "lock";
				await lockTicket(channel, ticket, locking);
				await interaction.reply({ embeds: [successEmbed(locking ? strings.ticket.locked : strings.ticket.unlocked)] });
				return;
			}

			case "claim":
				requireHandler();
				await claimTicketFor(ticket, interaction.user.id);
				await interaction.reply({
					embeds: [successEmbed(`${strings.ticket.claimed} ${interaction.user.toString()}.`)],
				});
				return;

			case "members": {
				requireHandler();
				const people = await memberCandidates(guild, ticket);
				await interaction.reply({
					embeds: [embed({ category: "tickets", description: strings.ticket.manageMenuTitle })],
					components: [
						selectRow(
							select({
								id: customId(TICKET_ID, "toggle-member"),
								placeholder: strings.ticket.manageMenuTitle,
								options: people.map((person) =>
									new StringSelectMenuOptionBuilder().setLabel(person.name).setValue(person.id),
								),
							}),
						),
					],
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			case "toggle-member": {
				if (!interaction.isStringSelectMenu()) return;

				const userId = interaction.values[0];
				if (userId === undefined) return;

				const change = await toggleTicketMember(channel, ticket, userId);
				await interaction.update({
					embeds: [
						successEmbed(
							`<@${userId}> ${change === "removed" ? strings.ticket.memberRemoved : strings.ticket.memberAdded}`,
						),
					],
					components: [],
				});
				return;
			}

			case "close":
				await interaction.reply({
					embeds: [
						embed({
							category: "tickets",
							title: strings.ticket.closingTitle,
							description: strings.ticket.closingDescription,
						}),
					],
				});
				await closeTicket(context.client, setup, ticket, channel, interaction.user);
				return;

			default:
				return;
		}
	},
});
