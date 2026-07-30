import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { button, channelSelect, roleSelect, row } from "@lib/components.util";
import {
	container,
	type ContainerMessage,
	containerMessage,
	type ContainerPart,
	divider,
	sectionWithButton,
	text,
} from "@lib/containers.util";
import { LEVEL_LIMITS, type LevelConfig } from "@lib/levelling.util";

/**
 * The levelling configuration, as four tabs of controls rather than a command with
 * eleven options nobody discovers.
 *
 * Two things this leans on Components V2 for:
 *
 * - Each boost role and each reward is a section with its own button, so the
 *   control sits beside the thing it changes. The old panel could only offer a row
 *   of buttons under a list, which means matching them up by counting.
 * - The role and channel menus carry their current selection as pre-ticked
 *   defaults, so the menu *is* the list — deselecting removes, and there is no
 *   separate remove button to hunt for.
 *
 * Every control applies immediately. Unlike the audit panel there is no draft to
 * save: each setting here is independent, so there is nothing to batch, and a
 * half-applied config is not a state anyone would want to be in.
 */

export const LEVEL_PANEL_ID = "levelling";

export const LEVEL_TABS = ["overview", "boosts", "rewards", "ignores"] as const;
export type LevelTab = (typeof LEVEL_TABS)[number];

const TAB_LABELS: Record<LevelTab, string> = {
	overview: "Overview",
	boosts: "XP boosts",
	rewards: "Role rewards",
	ignores: "Ignored",
};

export function isLevelTab(value: string): value is LevelTab {
	return (LEVEL_TABS as readonly string[]).includes(value);
}

export interface LevelPanelState {
	tab: LevelTab;
	config: LevelConfig;
	/** A one-line result from the last press, shown above the controls. */
	note?: string;
}

/**
 * The tab is always the first argument, so every control knows which screen to
 * re-render without anything being remembered between presses.
 */
function control(action: string, state: LevelPanelState, ownerId: string, ...args: (string | number)[]): string {
	return customId(LEVEL_PANEL_ID, action, state.tab, ...args, ownerId);
}

function tabRow(state: LevelPanelState, ownerId: string): ContainerPart {
	return row(
		...LEVEL_TABS.map((tab) =>
			button({
				id: customId(LEVEL_PANEL_ID, "tab", tab, ownerId),
				label: TAB_LABELS[tab],
				style: tab === state.tab ? ButtonStyle.Primary : ButtonStyle.Secondary,
				disabled: tab === state.tab,
			}),
		),
	);
}

function heading(state: LevelPanelState): string {
	const status = state.config.enabled ? "🟢 On" : "🔴 Off";
	return `## 📈 Levelling — ${TAB_LABELS[state.tab]}\n-# ${status} · ${state.config.boosts.length} boost roles · ${state.config.rewards.length} rewards`;
}

function overview(state: LevelPanelState, ownerId: string): ContainerPart[] {
	const { config } = state;
	const where = config.levelUpChannelId === null ? "wherever they were talking" : `<#${config.levelUpChannelId}>`;

	return [
		text(
			config.enabled
				? `Members earn XP for talking.\nLevel-ups are announced **${config.announce ? `in ${where}` : "nowhere — announcements are off"}**.`
				: "Levelling is off. Nobody is earning XP.\n-# Turn it on below; everything else can be set up afterwards.",
		),
		divider(),
		row(
			channelSelect({
				id: control("channel", state, ownerId),
				placeholder: "Announce level-ups in…",
				disabled: !config.enabled || !config.announce,
				...(config.levelUpChannelId !== null ? { defaultChannelIds: [config.levelUpChannelId] } : {}),
			}),
		),
		row(
			button({
				id: control("toggle", state, ownerId),
				label: config.enabled ? "Turn off" : "Turn on",
				style: config.enabled ? ButtonStyle.Danger : ButtonStyle.Success,
			}),
			button({
				id: control("announce", state, ownerId),
				label: config.announce ? "Silence level-ups" : "Announce level-ups",
				disabled: !config.enabled,
			}),
			button({
				id: control("here", state, ownerId),
				label: "Announce in chat",
				disabled: !config.enabled || !config.announce || config.levelUpChannelId === null,
			}),
			button({
				id: control("reset", state, ownerId),
				label: "Reset everything",
				style: ButtonStyle.Danger,
				disabled: !config.enabled && config.boosts.length === 0 && config.rewards.length === 0,
			}),
		),
	];
}

function boosts(state: LevelPanelState, ownerId: string): ContainerPart[] {
	const { config } = state;
	const parts: ContainerPart[] = [
		text(
			config.boosts.length === 0
				? `Pick roles that should earn XP faster. Up to ${LEVEL_LIMITS.maxBoosts}.\n-# A member with several boost roles gets the best one, not all of them multiplied together.`
				: "Press a multiplier to change it. Deselect a role in the menu to stop it boosting.",
		),
	];

	if (config.boosts.length > 0) {
		parts.push(divider());
		for (const boost of config.boosts) {
			parts.push(
				sectionWithButton(
					`<@&${boost.roleId}> — **×${boost.multiplier}** XP`,
					button({
						id: control("cycle", state, ownerId, boost.roleId),
						label: `×${boost.multiplier}`,
						style: ButtonStyle.Primary,
					}),
				),
			);
		}
	}

	parts.push(
		divider(),
		row(
			roleSelect({
				id: control("boost-roles", state, ownerId),
				placeholder: "Which roles earn bonus XP…",
				minValues: 0,
				maxValues: LEVEL_LIMITS.maxBoosts,
				defaultRoleIds: config.boosts.map((boost) => boost.roleId),
			}),
		),
	);

	return parts;
}

function rewards(state: LevelPanelState, ownerId: string): ContainerPart[] {
	const { config } = state;
	const parts: ContainerPart[] = [
		text(
			config.rewards.length === 0
				? `Hand out a role when someone reaches a level. Up to ${LEVEL_LIMITS.maxRewards}.\n-# Pick a role below and it will ask which level.`
				: config.stackRewards
					? "Members keep every reward they have earned."
					: "Members keep only their highest reward; lower ones are taken back.",
		),
	];

	if (config.rewards.length > 0) {
		parts.push(divider());
		for (const reward of config.rewards) {
			parts.push(
				sectionWithButton(
					`**Level ${reward.level}** → <@&${reward.roleId}>`,
					button({
						id: control("unreward", state, ownerId, reward.level),
						label: "Remove",
						style: ButtonStyle.Danger,
					}),
				),
			);
		}
	}

	parts.push(
		divider(),
		row(
			roleSelect({
				id: control("reward-role", state, ownerId),
				placeholder: "Give a role at a certain level…",
				disabled: config.rewards.length >= LEVEL_LIMITS.maxRewards,
			}),
		),
		row(
			button({
				id: control("stack", state, ownerId),
				label: config.stackRewards ? "Keep only the highest" : "Keep every reward",
				disabled: config.rewards.length === 0,
			}),
		),
	);

	return parts;
}

function ignores(state: LevelPanelState, ownerId: string): ContainerPart[] {
	const { config } = state;

	return [
		text(
			"Channels and roles that earn no XP at all.\n-# Useful for a spam channel, a bot-commands channel, or a muted role.",
		),
		divider(),
		text(
			config.ignoredChannelIds.length === 0
				? "-# No ignored channels."
				: `**Ignored channels**\n${config.ignoredChannelIds.map((id) => `<#${id}>`).join(" ")}`,
		),
		row(
			channelSelect({
				id: control("ignore-channels", state, ownerId),
				placeholder: "Channels that earn no XP…",
				minValues: 0,
				maxValues: LEVEL_LIMITS.maxIgnoredChannels,
				defaultChannelIds: config.ignoredChannelIds,
			}),
		),
		divider({ spacer: true }),
		text(
			config.ignoredRoleIds.length === 0
				? "-# No ignored roles."
				: `**Ignored roles**\n${config.ignoredRoleIds.map((id) => `<@&${id}>`).join(" ")}`,
		),
		row(
			roleSelect({
				id: control("ignore-roles", state, ownerId),
				placeholder: "Roles that earn no XP…",
				minValues: 0,
				maxValues: LEVEL_LIMITS.maxIgnoredRoles,
				defaultRoleIds: config.ignoredRoleIds,
			}),
		),
	];
}

const TABS: Record<LevelTab, (state: LevelPanelState, ownerId: string) => ContainerPart[]> = {
	overview,
	boosts,
	rewards,
	ignores,
};

export function levelPanel(state: LevelPanelState, ownerId: string): ContainerMessage {
	const parts: ContainerPart[] = [text(heading(state))];

	if (state.note !== undefined) parts.push(text(`-# ${state.note}`));
	parts.push(divider(), ...TABS[state.tab](state, ownerId), divider(), tabRow(state, ownerId));

	return containerMessage(container({ category: "levelling", parts }));
}
