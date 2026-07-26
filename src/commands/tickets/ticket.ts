import { ButtonStyle, ChannelType, MessageFlags, PermissionFlagsBits } from "discord.js";
import { customId } from "../../core/button";
import { defineCommand, inGuild, roleOption, textChannelOption } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { deleteTicketSetup, getTicketSetup, saveTicketSetup } from "../../database/repositories/ticketRepository";
import { button, row } from "../../lib/components";
import { embed, successEmbed } from "../../lib/embeds";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "ticket",
	description: "Sets up the ticket panel members use to contact your staff.",
	category: "tickets",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles],

	subcommands: [
		{
			name: "setup",
			description: "Posts the ticket panel and saves where tickets should go.",
			options: [
				{ name: "panel-channel", description: "Where the panel is posted.", type: "channel", required: true },
				{ name: "category", description: "The category new tickets are created in.", type: "channel", required: true },
				{
					name: "transcripts",
					description: "Where closed-ticket transcripts are sent.",
					type: "channel",
					required: true,
				},
				{ name: "staff-role", description: "The role that can see and handle tickets.", type: "role", required: true },
				{ name: "message", description: "The text shown on the panel.", type: "string", maxLength: 1_000 },
				{ name: "button-label", description: "The text on the button.", type: "string", maxLength: 40 },
			],

			async run(interaction) {
				const guild = inGuild(interaction);

				const panelChannel = textChannelOption(interaction, "panel-channel");
				if (!panelChannel) throw new UserFacingError("Pick a channel I can post the panel in.");

				const category = interaction.options.getChannel("category", true);
				if (category.type !== ChannelType.GuildCategory) {
					throw new UserFacingError("The category has to be an actual channel category.");
				}

				const transcripts = textChannelOption(interaction, "transcripts");
				if (!transcripts) throw new UserFacingError("Pick a channel I can send transcripts to.");

				const staffRole = roleOption(interaction, "staff-role", true);
				if (!staffRole) throw new UserFacingError("Pick the role that should handle tickets.");

				const description =
					interaction.options.getString("message") ?? "Press the button below and we will be with you shortly.";
				const buttonLabel = interaction.options.getString("button-label") ?? "Create ticket";

				await panelChannel.send({
					embeds: [embed({ category: "tickets", title: "Need a hand?", description })],
					components: [
						row(
							button({
								id: customId("ticket", "open"),
								label: buttonLabel,
								emoji: "🎫",
								style: ButtonStyle.Primary,
							}),
						),
					],
				});

				await saveTicketSetup(guild.id, {
					channelId: panelChannel.id,
					categoryId: category.id,
					transcriptChannelId: transcripts.id,
					handlerRoleId: staffRole.id,
					everyoneRoleId: guild.roles.everyone.id,
					description,
					buttonLabel,
					buttonEmoji: "🎫",
				});

				await reply(interaction, {
					embeds: [successEmbed(`Ticket panel posted in ${panelChannel}.`)],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
		{
			name: "status",
			description: "Shows how tickets are currently configured.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const setup = await getTicketSetup(guild.id);

				if (!setup) throw new UserFacingError("Tickets are not set up yet. Run `/ticket setup` first.");

				await reply(interaction, {
					embeds: [
						embed({
							category: "tickets",
							title: "Ticket settings",
							fields: [
								{ name: "Panel", value: `<#${setup.channelId}>`, inline: true },
								{ name: "Category", value: `<#${setup.categoryId}>`, inline: true },
								{ name: "Transcripts", value: `<#${setup.transcriptChannelId}>`, inline: true },
								{ name: "Staff role", value: `<@&${setup.handlerRoleId}>`, inline: true },
							],
						}),
					],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
		{
			name: "disable",
			description: "Turns the ticket system off. Existing ticket channels are left alone.",
			async run(interaction) {
				const guild = inGuild(interaction);

				if (!(await deleteTicketSetup(guild.id))) {
					throw new UserFacingError("Tickets were not set up in this server.");
				}

				await reply(interaction, {
					embeds: [successEmbed("Tickets are off. The panel message can be deleted by hand.")],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
	],
});
