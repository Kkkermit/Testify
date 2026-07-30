import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { deleteLevelSettings, getLevelSettings, saveLevelSettings } from "@database/repositories/levelRepository";
import { modalForm } from "@lib/components.util";
import {
	LEVEL_LIMITS,
	type LevelConfig,
	nextMultiplier,
	normaliseSettings,
	withBoost,
	withReward,
} from "@lib/levelling.util";
import { isLevelTab, LEVEL_PANEL_ID, type LevelPanelState, levelPanel, type LevelTab } from "@lib/levelPanel.util";
import { parseWholeNumber } from "@lib/settingsPanel.util";

/**
 * Every control on the levelling panel.
 *
 * The config is re-read from the database before each change and written back
 * immediately, so two admins with the panel open see each other's work rather than
 * overwriting it with whatever their copy of the message was rendered with.
 */
async function currentConfig(guildId: string): Promise<LevelConfig> {
	return normaliseSettings(await getLevelSettings(guildId));
}

/** Only the fields the panel owns, so a write cannot clear something it never showed. */
async function persist(guildId: string, config: LevelConfig): Promise<void> {
	await saveLevelSettings(guildId, {
		isDisabled: !config.enabled,
		boosts: config.boosts,
		rewards: config.rewards,
		stackRewards: config.stackRewards,
		levelUpChannelId: config.levelUpChannelId,
		announce: config.announce,
		ignoredChannelIds: config.ignoredChannelIds,
		ignoredRoleIds: config.ignoredRoleIds,
	});
}

export default defineButton({
	id: LEVEL_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;

		// The panel is a normal message, so the permission is the gate rather than who
		// happens to be pressing.
		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change the levelling settings.");
		}

		const guildId = interaction.guild.id;
		const ownerId = interaction.user.id;
		const [first] = context.args;
		const tab: LevelTab = first !== undefined && isLevelTab(first) ? first : "overview";
		const config = await currentConfig(guildId);

		const show = async (next: LevelConfig, note?: string): Promise<void> => {
			const state: LevelPanelState = { tab, config: next, ...(note !== undefined ? { note } : {}) };
			const payload = levelPanel(state, ownerId);

			// A modal opened from the panel can edit the message it came from; one opened
			// any other way has nothing to edit and has to answer on its own.
			if (interaction.isModalSubmit() && !interaction.isFromMessage()) {
				await interaction.reply(payload);
				return;
			}

			await interaction.update(payload);
		};

		const save = async (next: LevelConfig, note?: string): Promise<void> => {
			await persist(guildId, next);
			await show(next, note);
		};

		switch (context.action) {
			case "tab":
				await show(config);
				return;

			case "toggle":
				await save(
					{ ...config, enabled: !config.enabled },
					config.enabled ? "Levelling is off. XP already earned is kept." : "Levelling is on.",
				);
				return;

			case "announce":
				await save({ ...config, announce: !config.announce }, config.announce ? "Level-ups are silent." : undefined);
				return;

			case "here":
				await save({ ...config, levelUpChannelId: null }, "Level-ups are announced wherever the member was talking.");
				return;

			case "reset": {
				await deleteLevelSettings(guildId);
				await show(await currentConfig(guildId), "Configuration cleared. Earned XP is untouched.");
				return;
			}

			case "channel": {
				if (!interaction.isChannelSelectMenu()) return;

				const [channelId] = interaction.values;
				if (channelId === undefined) return;

				const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
				if (channel?.isSendable() !== true) {
					throw new UserFacingError("I cannot post in that channel. Pick one I can send messages to.");
				}

				await save({ ...config, levelUpChannelId: channelId });
				return;
			}

			case "boost-roles": {
				if (!interaction.isRoleSelectMenu()) return;

				// Roles already boosting keep their multiplier; new ones start at ×2, since
				// ×1 would be a boost that does nothing.
				const chosen = interaction.values;
				const boosts = chosen.map(
					(roleId) => config.boosts.find((boost) => boost.roleId === roleId) ?? { roleId, multiplier: 2 },
				);

				await save({ ...config, boosts: boosts.slice(0, LEVEL_LIMITS.maxBoosts) });
				return;
			}

			case "cycle": {
				const [, roleId] = context.args;
				if (roleId === undefined) return;

				const boost = config.boosts.find((entry) => entry.roleId === roleId);
				if (boost === undefined) throw new UserFacingError("That role is not boosting any more. Reopen the panel.");

				await save({ ...config, boosts: withBoost(config.boosts, roleId, nextMultiplier(boost.multiplier)) });
				return;
			}

			case "reward-role": {
				if (!interaction.isRoleSelectMenu()) return;

				const [roleId] = interaction.values;
				if (roleId === undefined) return;

				await interaction.showModal(
					modalForm({
						id: LEVEL_PANEL_ID,
						action: "reward-level",
						args: [tab, roleId, ownerId],
						title: "Give this role at which level?",
						fields: [
							{
								id: "level",
								label: `Level (1 to ${LEVEL_LIMITS.maxRewardLevel})`,
								placeholder: "10",
								maxLength: 3,
							},
						],
					}),
				);
				return;
			}

			case "reward-level": {
				if (!interaction.isModalSubmit()) return;

				const [, roleId] = context.args;
				if (roleId === undefined) return;

				const parsed = parseWholeNumber(interaction.fields.getTextInputValue("level"), "Level", {
					min: 1,
					max: LEVEL_LIMITS.maxRewardLevel,
				});
				if (!parsed.ok) throw new UserFacingError(parsed.reason);

				const rewards = withReward(config.rewards, parsed.value, roleId);
				if (rewards === config.rewards) {
					throw new UserFacingError(`You already have ${LEVEL_LIMITS.maxRewards} rewards. Remove one first.`);
				}

				await save({ ...config, rewards }, `<@&${roleId}> is now given at level ${parsed.value}.`);
				return;
			}

			case "unreward": {
				const [, level] = context.args;
				const target = Number.parseInt(level ?? "", 10);
				if (Number.isNaN(target)) return;

				await save({ ...config, rewards: config.rewards.filter((reward) => reward.level !== target) });
				return;
			}

			case "stack":
				await save(
					{ ...config, stackRewards: !config.stackRewards },
					config.stackRewards
						? "Members will keep only their highest reward from now on."
						: "Members will keep every reward they earn.",
				);
				return;

			case "ignore-channels": {
				if (!interaction.isChannelSelectMenu()) return;

				await save({ ...config, ignoredChannelIds: interaction.values.slice(0, LEVEL_LIMITS.maxIgnoredChannels) });
				return;
			}

			case "ignore-roles": {
				if (!interaction.isRoleSelectMenu()) return;

				await save({ ...config, ignoredRoleIds: interaction.values.slice(0, LEVEL_LIMITS.maxIgnoredRoles) });
				return;
			}

			default:
				return;
		}
	},
});
