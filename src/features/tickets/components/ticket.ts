import {
	ButtonStyle,
	ChannelType,
	MessageFlags,
	PermissionFlagsBits,
	StringSelectMenuOptionBuilder,
	type TextChannel,
} from "discord.js";
import { createTranscript } from "discord-html-transcripts";
import { Category } from "../../../config/categories";
import { TICKET } from "../../../config/constants";
import { strings } from "../../../config/strings";
import { defineComponent } from "../../../core/component";
import { encodeId, Namespace } from "../../../core/customId";
import { UserFacingError } from "../../../core/errors";
import {
	addTicketMember,
	claimTicket,
	createTicket,
	deleteTicket,
	findOpenTicket,
	getTicketByChannel,
	getTicketSetup,
	removeTicketMember,
	setTicketLocked,
} from "../../../database/repositories/ticketRepository";
import { button, row, select, selectRow } from "../../../ui/components";
import { embed, successEmbed } from "../../../ui/embeds";

function controlRow() {
	return row(
		button({
			id: encodeId(Namespace.Ticket, "close"),
			label: strings.ticket.closeLabel,
			emoji: strings.ticket.closeEmoji,
			style: ButtonStyle.Danger,
		}),
		button({
			id: encodeId(Namespace.Ticket, "lock"),
			label: strings.ticket.lockLabel,
			emoji: strings.ticket.lockEmoji,
			style: ButtonStyle.Secondary,
		}),
		button({
			id: encodeId(Namespace.Ticket, "unlock"),
			label: strings.ticket.unlockLabel,
			emoji: strings.ticket.unlockEmoji,
			style: ButtonStyle.Secondary,
		}),
		button({
			id: encodeId(Namespace.Ticket, "claim"),
			label: strings.ticket.claimLabel,
			emoji: strings.ticket.claimEmoji,
			style: ButtonStyle.Success,
		}),
		button({
			id: encodeId(Namespace.Ticket, "members"),
			label: strings.ticket.manageLabel,
			emoji: strings.ticket.manageEmoji,
			style: ButtonStyle.Primary,
		}),
	);
}

export default defineComponent({
	namespace: Namespace.Ticket,

	async handle(ctx) {
		const interaction = ctx.interaction;
		const guild = interaction.guild;
		if (!guild) throw new UserFacingError(strings.generic.guildOnly);

		const setup = await getTicketSetup(guild.id);
		if (!setup) throw new UserFacingError("The ticket system is not configured in this server.");

		if (ctx.action === "open") {
			if (!interaction.isButton()) return;

			const existing = await findOpenTicket(guild.id, interaction.user.id);
			if (existing) throw new UserFacingError(strings.ticket.alreadyExists);

			const channel = await guild.channels.create({
				name: `${TICKET.namePrefix}${interaction.user.username}`.slice(0, 100),
				type: ChannelType.GuildText,
				parent: setup.categoryId,
				permissionOverwrites: [
					{ id: setup.everyoneRoleId, deny: [PermissionFlagsBits.ViewChannel] },
					{
						id: interaction.user.id,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.SendMessages,
							PermissionFlagsBits.ReadMessageHistory,
							PermissionFlagsBits.AttachFiles,
						],
					},
					{
						id: setup.handlerRoleId,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.SendMessages,
							PermissionFlagsBits.ReadMessageHistory,
							PermissionFlagsBits.ManageMessages,
						],
					},
				],
			});

			await createTicket({ guildId: guild.id, ownerId: interaction.user.id, channelId: channel.id });

			await channel.send({
				content: `${interaction.user} <@&${setup.handlerRoleId}>`,
				embeds: [
					embed({
						category: Category.Tickets,
						title: strings.ticket.welcomeTitle,
						description: strings.ticket.welcomeDescription,
					}),
				],
				components: [controlRow()],
			});

			await interaction.reply({
				embeds: [successEmbed(`${strings.ticket.created} ${channel}`)],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const ticket = await getTicketByChannel(interaction.channelId ?? "");
		if (!ticket) throw new UserFacingError("This is not a ticket channel.");

		const member = await guild.members.fetch(interaction.user.id).catch(() => null);
		const isHandler = member?.roles.cache.has(setup.handlerRoleId) === true;
		const isOwner = ticket.ownerId === interaction.user.id;

		if (!isHandler && !isOwner) throw new UserFacingError(strings.ticket.noPermissions);

		const channel = interaction.channel as TextChannel | null;
		if (!channel) throw new UserFacingError(strings.ticket.error);

		switch (ctx.action) {
			case "lock":
			case "unlock": {
				if (!isHandler) throw new UserFacingError(strings.ticket.noPermissions);
				const locking = ctx.action === "lock";
				if (ticket.isLocked === locking) {
					throw new UserFacingError(locking ? strings.ticket.alreadyLocked : strings.ticket.alreadyUnlocked);
				}

				await channel.permissionOverwrites.edit(ticket.ownerId, { SendMessages: locking ? false : true });
				await setTicketLocked(channel.id, locking);

				await interaction.reply({
					embeds: [successEmbed(locking ? strings.ticket.locked : strings.ticket.unlocked)],
				});
				return;
			}

			case "claim": {
				if (!isHandler) throw new UserFacingError(strings.ticket.noPermissions);

				const claimed = await claimTicket(channel.id, interaction.user.id);
				if (!claimed) {
					throw new UserFacingError(`${strings.ticket.alreadyClaimed} <@${ticket.claimedById ?? "unknown"}>.`);
				}

				await interaction.reply({ embeds: [successEmbed(`${strings.ticket.claimed} ${interaction.user}.`)] });
				return;
			}

			case "members": {
				if (!isHandler) throw new UserFacingError(strings.ticket.noPermissions);

				const candidates = await guild.members.fetch({ limit: 25 });
				const options = candidates
					.filter((candidate) => !candidate.user.bot && candidate.id !== ticket.ownerId)
					.first(25)
					.map((candidate) =>
						new StringSelectMenuOptionBuilder().setLabel(candidate.displayName).setValue(candidate.id),
					);

				if (options.length === 0) throw new UserFacingError("There is nobody else to add.");

				await interaction.reply({
					embeds: [embed({ category: Category.Tickets, description: strings.ticket.manageMenuTitle })],
					components: [
						selectRow(
							select({
								id: encodeId(Namespace.Ticket, "toggle-member"),
								placeholder: strings.ticket.manageMenuTitle,
								options,
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

				if (ticket.memberIds.includes(userId)) {
					await channel.permissionOverwrites.delete(userId);
					await removeTicketMember(channel.id, userId);
					await interaction.update({
						embeds: [successEmbed(`<@${userId}> ${strings.ticket.memberRemoved}`)],
						components: [],
					});
					return;
				}

				await channel.permissionOverwrites.edit(userId, {
					ViewChannel: true,
					SendMessages: true,
					ReadMessageHistory: true,
				});
				await addTicketMember(channel.id, userId);
				await interaction.update({
					embeds: [successEmbed(`<@${userId}> ${strings.ticket.memberAdded}`)],
					components: [],
				});
				return;
			}

			case "close": {
				await interaction.reply({
					embeds: [
						embed({
							category: Category.Tickets,
							title: strings.ticket.closingTitle,
							description: strings.ticket.closingDescription,
						}),
					],
				});

				const transcriptChannel = await ctx.client.channels.fetch(setup.transcriptChannelId).catch(() => null);
				if (transcriptChannel?.isTextBased() && transcriptChannel.isSendable()) {
					const transcript = await createTranscript(channel, {
						filename: `ticket-${ticket.ticketId}.html`,
						poweredBy: false,
					});

					await transcriptChannel.send({
						embeds: [
							embed({
								category: Category.Tickets,
								title: `Ticket ${ticket.ticketId} closed`,
								fields: [
									{ name: strings.ticket.transcriptMember, value: `<@${ticket.ownerId}>`, inline: true },
									{
										name: strings.ticket.transcriptClaimed,
										value: ticket.claimedById !== null ? `<@${ticket.claimedById}>` : "Nobody",
										inline: true,
									},
									{ name: strings.ticket.transcriptModerator, value: `${interaction.user}`, inline: true },
								],
							}),
						],
						files: [transcript],
					});
				}

				await deleteTicket(channel.id);
				ctx.client.timers.timeout(`ticket:${channel.id}`, TICKET.closeDelayMs, async () => {
					await channel.delete(`Ticket closed by ${interaction.user.username}`).catch(() => null);
				});
				return;
			}

			default:
				return;
		}
	},
});
