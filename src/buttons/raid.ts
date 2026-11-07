import { PermissionFlagsBits } from "discord.js";
import { MINUTE_MS } from "@config/constants";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { modalForm, pickedChannelId } from "@lib/discord";
import { formatDuration } from "@lib/format";
import { ageFromText, applyRaidSettings, RAID_PANEL_ID, raidPanel, readRaidOverview, wholeNumber } from "@lib/raid";
import { recordsSettings } from "@lib/settings";
import { RAID_LIMITS, type RaidPatch } from "@testify/shared";

export default recordsSettings(
	["raid.update"],
	defineButton({
		id: RAID_PANEL_ID,
		ownerOnly: true,

		async run(interaction, context) {
			const guild = interaction.guild;
			if (guild === null) return;

			const permissions = interaction.memberPermissions;
			if (
				permissions?.has(PermissionFlagsBits.ManageGuild) !== true ||
				!permissions.has(PermissionFlagsBits.ModerateMembers)
			) {
				throw new UserFacingError("You need Manage Server and Moderate Members to change raid protection.");
			}

			const ownerId = interaction.user.id;
			const current = await readRaidOverview(guild);

			if (interaction.isButton() && context.action === "age") {
				await interaction.showModal(
					modalForm({
						id: RAID_PANEL_ID,
						action: "save-age",
						args: [ownerId],
						title: "Minimum account age",
						fields: [
							{
								id: "age",
								label: "A length such as 30m, 12h or 7d; 0 for off",
								value:
									current.minAccountAgeMinutes === 0 ? "0" : formatDuration(current.minAccountAgeMinutes * MINUTE_MS),
								maxLength: 20,
							},
						],
					}),
				);
				return;
			}

			if (interaction.isButton() && context.action === "spike") {
				await interaction.showModal(
					modalForm({
						id: RAID_PANEL_ID,
						action: "save-spike",
						args: [ownerId],
						title: "Spike alert",
						fields: [
							{
								id: "joins",
								label: `Joins, from ${String(RAID_LIMITS.minSpikeJoins)} to ${String(RAID_LIMITS.maxSpikeJoins)}`,
								value: String(current.spikeJoins),
								maxLength: 3,
							},
							{
								id: "minutes",
								label: `Within minutes, from ${String(RAID_LIMITS.minSpikeMinutes)} to ${String(RAID_LIMITS.maxSpikeMinutes)}`,
								value: String(current.spikeMinutes),
								maxLength: 2,
							},
						],
					}),
				);
				return;
			}

			let patch: RaidPatch;
			let note: string;

			if (interaction.isModalSubmit() && context.action === "save-age") {
				const minAccountAgeMinutes = ageFromText(interaction.fields.getTextInputValue("age"));
				if (minAccountAgeMinutes === null) {
					throw new UserFacingError(
						"Give a length in whole minutes, such as `30m`, `12h` or `7d`, up to `28d`, Discord's longest timeout. `0` holds nobody back.",
					);
				}
				patch = { minAccountAgeMinutes };
				note = minAccountAgeMinutes === 0 ? "Nobody is held back now." : "The minimum account age is saved.";
			} else if (interaction.isModalSubmit() && context.action === "save-spike") {
				const spikeJoins = wholeNumber(
					interaction.fields.getTextInputValue("joins"),
					RAID_LIMITS.minSpikeJoins,
					RAID_LIMITS.maxSpikeJoins,
				);
				const spikeMinutes = wholeNumber(
					interaction.fields.getTextInputValue("minutes"),
					RAID_LIMITS.minSpikeMinutes,
					RAID_LIMITS.maxSpikeMinutes,
				);
				if (spikeJoins === null || spikeMinutes === null) {
					throw new UserFacingError(
						`Give from ${String(RAID_LIMITS.minSpikeJoins)} to ${String(RAID_LIMITS.maxSpikeJoins)} joins within ${String(RAID_LIMITS.minSpikeMinutes)} to ${String(RAID_LIMITS.maxSpikeMinutes)} minutes.`,
					);
				}
				patch = { spikeJoins, spikeMinutes };
				note = "The spike alert is saved.";
			} else if (interaction.isChannelSelectMenu() && context.action === "channel") {
				const alertChannelId = interaction.values.length === 0 ? null : await pickedChannelId(interaction, guild);
				patch = { alertChannelId };
				note = alertChannelId === null ? "Alerts are off." : `Alerts will be posted in <#${alertChannelId}>.`;
			} else if (interaction.isRoleSelectMenu() && context.action === "role") {
				const pingRoleId = interaction.values[0] ?? null;
				patch = { pingRoleId };
				note = pingRoleId === null ? "A spike pings nobody now." : `A spike will ping <@&${pingRoleId}>.`;
			} else if (interaction.isButton() && context.action === "toggle") {
				patch = { enabled: !current.enabled };
				note = current.enabled ? "Raid protection is off." : "Raid protection is on.";
			} else {
				return;
			}

			const saved = await applyRaidSettings(guild, patch, ownerId);
			if (interaction.isModalSubmit() && !interaction.isFromMessage()) return;
			await interaction.update(raidPanel(saved, ownerId, note));
		},
	}),
);
