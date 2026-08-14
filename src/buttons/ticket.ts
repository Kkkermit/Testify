import { createTranscript } from "discord-html-transcripts";
import {
	ButtonStyle,
	ChannelType,
	type Guild,
	MessageFlags,
	PermissionFlagsBits,
	StringSelectMenuOptionBuilder,
	type TextChannel,
} from "discord.js";
import { TICKET } from "@config/constants";
import { strings } from "@config/strings";
import { type ButtonContext, type ComponentInteraction, customId, defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { type TicketRecord, type TicketSetupRecord } from "@database/models/tickets.schema";
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
} from "@database/repositories/ticketRepository";
import { button, row, select, selectRow } from "@lib/components.util";
import { embed, successEmbed } from "@lib/embeds.util";

function controlRow() {
	return row(
		button({
			id: customId("ticket", "close"),
			label: strings.ticket.closeLabel,
			emoji: strings.ticket.closeEmoji,
			style: ButtonStyle.Danger,
		}),
		button({
			id: customId("ticket", "lock"),
			label: strings.ticket.lockLabel,
			emoji: strings.ticket.lockEmoji,
			style: ButtonStyle.Secondary,
		}),
		button({
			id: customId("ticket", "unlock"),
			label: strings.ticket.unlockLabel,
			emoji: strings.ticket.unlockEmoji,
			style: ButtonStyle.Secondary,
		}),
		button({
			id: customId("ticket", "claim"),
			label: strings.ticket.claimLabel,
			emoji: strings.ticket.claimEmoji,
			style: ButtonStyle.Success,
		}),
		button({
			id: customId("ticket", "members"),
			label: strings.ticket.manageLabel,
			emoji: strings.ticket.manageEmoji,
			style: ButtonStyle.Primary,
		}),
	);
}

/** Everything an action inside a ticket needs, gathered and permission-checked once by `run`. */
interface OpenTicket {
	setup: TicketSetupRecord;
	ticket: TicketRecord;
	channel: TextChannel;
	isHandler: boolean;
}

async function openTicket(interaction: ComponentInteraction, guild: Guild, setup: TicketSetupRecord): Promise<void> {
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
				category: "tickets",
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
}

async function setLocked(interaction: ComponentInteraction, open: OpenTicket, locking: boolean): Promise<void> {
	if (open.ticket.isLocked === locking) {
		throw new UserFacingError(locking ? strings.ticket.alreadyLocked : strings.ticket.alreadyUnlocked);
	}

	await open.channel.permissionOverwrites.edit(open.ticket.ownerId, { SendMessages: !locking });
	await setTicketLocked(open.channel.id, locking);

	await interaction.reply({ embeds: [successEmbed(locking ? strings.ticket.locked : strings.ticket.unlocked)] });
}

async function claim(interaction: ComponentInteraction, open: OpenTicket): Promise<void> {
	const claimed = await claimTicket(open.channel.id, interaction.user.id);
	if (!claimed) {
		throw new UserFacingError(`${strings.ticket.alreadyClaimed} <@${open.ticket.claimedById ?? "unknown"}>.`);
	}

	await interaction.reply({ embeds: [successEmbed(`${strings.ticket.claimed} ${interaction.user}.`)] });
}

async function offerMembers(interaction: ComponentInteraction, guild: Guild, open: OpenTicket): Promise<void> {
	const candidates = await guild.members.fetch({ limit: 25 });
	const options = candidates
		.filter((candidate) => !candidate.user.bot && candidate.id !== open.ticket.ownerId)
		.first(25)
		.map((candidate) => new StringSelectMenuOptionBuilder().setLabel(candidate.displayName).setValue(candidate.id));

	if (options.length === 0) throw new UserFacingError("There is nobody else to add.");

	await interaction.reply({
		embeds: [embed({ category: "tickets", description: strings.ticket.manageMenuTitle })],
		components: [
			selectRow(
				select({
					id: customId("ticket", "toggle-member"),
					placeholder: strings.ticket.manageMenuTitle,
					options,
				}),
			),
		],
		flags: MessageFlags.Ephemeral,
	});
}

async function toggleMember(interaction: ComponentInteraction, open: OpenTicket): Promise<void> {
	if (!interaction.isStringSelectMenu()) return;

	const userId = interaction.values[0];
	if (userId === undefined) return;

	const removing = open.ticket.memberIds.includes(userId);

	if (removing) {
		await open.channel.permissionOverwrites.delete(userId);
		await removeTicketMember(open.channel.id, userId);
	} else {
		await open.channel.permissionOverwrites.edit(userId, {
			ViewChannel: true,
			SendMessages: true,
			ReadMessageHistory: true,
		});
		await addTicketMember(open.channel.id, userId);
	}

	await interaction.update({
		embeds: [successEmbed(`<@${userId}> ${removing ? strings.ticket.memberRemoved : strings.ticket.memberAdded}`)],
		components: [],
	});
}

/** Returns without filing anything when the configured channel has gone or the bot can no longer post in it. */
async function fileTranscript(
	interaction: ComponentInteraction,
	context: ButtonContext,
	open: OpenTicket,
): Promise<void> {
	const destination = await context.client.channels.fetch(open.setup.transcriptChannelId).catch(() => null);
	if (destination?.isTextBased() !== true || !destination.isSendable()) return;

	const transcript = await createTranscript(open.channel, {
		filename: `ticket-${open.ticket.ticketId}.html`,
		poweredBy: false,
	});

	await destination.send({
		embeds: [
			embed({
				category: "tickets",
				title: `Ticket ${open.ticket.ticketId} closed`,
				fields: [
					{ name: strings.ticket.transcriptMember, value: `<@${open.ticket.ownerId}>`, inline: true },
					{
						name: strings.ticket.transcriptClaimed,
						value: open.ticket.claimedById !== null ? `<@${open.ticket.claimedById}>` : "Nobody",
						inline: true,
					},
					{ name: strings.ticket.transcriptModerator, value: `${interaction.user}`, inline: true },
				],
			}),
		],
		files: [transcript],
	});
}

async function close(interaction: ComponentInteraction, context: ButtonContext, open: OpenTicket): Promise<void> {
	await interaction.reply({
		embeds: [
			embed({
				category: "tickets",
				title: strings.ticket.closingTitle,
				description: strings.ticket.closingDescription,
			}),
		],
	});

	await fileTranscript(interaction, context, open);
	await deleteTicket(open.channel.id);

	context.client.timers.after(`ticket:${open.channel.id}`, TICKET.closeDelayMs, async () => {
		await open.channel.delete(`Ticket closed by ${interaction.user.username}`).catch(() => null);
	});
}

/** Only the handler role may act on somebody else's ticket; the owner gets close and nothing more. */
function requireHandler(open: OpenTicket): void {
	if (!open.isHandler) throw new UserFacingError(strings.ticket.noPermissions);
}

export default defineButton({
	id: "ticket",

	async run(interaction, context) {
		const guild = interaction.guild;
		if (!guild) throw new UserFacingError(strings.generic.guildOnly);

		const setup = await getTicketSetup(guild.id);
		if (!setup) throw new UserFacingError("The ticket system is not configured in this server.");

		// The panel button is pressed outside any ticket, so it runs before the checks every other action needs.
		if (context.action === "open") {
			if (interaction.isButton()) await openTicket(interaction, guild, setup);
			return;
		}

		const ticket = await getTicketByChannel(interaction.channelId ?? "");
		if (!ticket) throw new UserFacingError("This is not a ticket channel.");

		const channel = interaction.channel as TextChannel | null;
		if (!channel) throw new UserFacingError(strings.ticket.error);

		const member = await guild.members.fetch(interaction.user.id).catch(() => null);
		const open: OpenTicket = {
			setup,
			ticket,
			channel,
			isHandler: member?.roles.cache.has(setup.handlerRoleId) === true,
		};

		if (!open.isHandler && ticket.ownerId !== interaction.user.id) {
			throw new UserFacingError(strings.ticket.noPermissions);
		}

		switch (context.action) {
			case "lock":
			case "unlock":
				requireHandler(open);
				return setLocked(interaction, open, context.action === "lock");

			case "claim":
				requireHandler(open);
				return claim(interaction, open);

			case "members":
				requireHandler(open);
				return offerMembers(interaction, guild, open);

			case "toggle-member":
				return toggleMember(interaction, open);

			case "close":
				return close(interaction, context, open);

			default:
				return;
		}
	},
});
