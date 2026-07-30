import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { type VerifySettings } from "@database/models/verification.schema";
import { button, channelSelect, roleSelect, row } from "@lib/components.util";
import {
	container,
	type ContainerMessage,
	containerMessage,
	type ContainerPart,
	divider,
	text,
} from "@lib/containers.util";
import { formatNumber } from "@lib/format.util";

/**
 * Setting up verification, as one screen rather than a command with three
 * required options.
 *
 * The old `/verify setup <role> <channel> <content>` posted the public panel as a
 * side effect of configuring, so changing the wording meant running setup again
 * and leaving the previous panel behind. Here the configuration and the posted
 * message are separate: pick the channel and role, write the wording, then press
 * **Post the panel** — which edits the existing one if there is one.
 */

export const VERIFY_PANEL_ID = "verifysetup";

export const DEFAULT_VERIFY_MESSAGE = "Press the button below to verify yourself and unlock the rest of the server.";

export interface VerifyConfig {
	channelId: string | null;
	roleId: string | null;
	messageId: string | null;
	message: string;
	verifiedCount: number;
}

/** Fields added after the first version, which a document written then will lack. */
export type StoredVerifySettings = Omit<VerifySettings, "message"> & Partial<Pick<VerifySettings, "message">>;

export function normaliseVerify(settings: StoredVerifySettings | null): VerifyConfig {
	if (settings === null) {
		return { channelId: null, roleId: null, messageId: null, message: DEFAULT_VERIFY_MESSAGE, verifiedCount: 0 };
	}

	return {
		channelId: settings.channelId,
		roleId: settings.roleId,
		messageId: settings.messageId,
		// `?? ""` would render an empty panel, so a blank stored value falls back too.
		message: settings.message === undefined || settings.message === "" ? DEFAULT_VERIFY_MESSAGE : settings.message,
		verifiedCount: settings.verifiedIds.length,
	};
}

export interface VerifyPanelState {
	config: VerifyConfig;
	/** True when the bot cannot hand out the chosen role, so the panel can say so. */
	roleTooHigh?: boolean;
	note?: string;
}

/** Everything needed before the public panel is worth posting. */
export function isReady(config: VerifyConfig): boolean {
	return config.channelId !== null && config.roleId !== null;
}

function control(action: string, ownerId: string): string {
	return customId(VERIFY_PANEL_ID, action, ownerId);
}

function summary(state: VerifyPanelState): string {
	const { config } = state;

	if (!isReady(config)) {
		const missing = [
			config.channelId === null ? "a channel" : null,
			config.roleId === null ? "a role to grant" : null,
		].filter((part): part is string => part !== null);

		return (
			"## 🛡️ Verification\n" +
			`Not set up yet — still needs ${missing.join(" and ")}.\n` +
			"-# New members press a button, type a short code, and get the role."
		);
	}

	const posted = config.messageId === null ? "Not posted yet." : "The panel is posted.";

	return (
		"## 🛡️ Verification\n" +
		`Members verify in <#${config.channelId}> and are given <@&${config.roleId}>.\n` +
		`-# ${posted} **${formatNumber(config.verifiedCount)}** verified so far.`
	);
}

export function verifyPanel(state: VerifyPanelState, ownerId: string): ContainerMessage {
	const { config } = state;
	const ready = isReady(config);

	const parts: ContainerPart[] = [text(summary(state))];
	if (state.note !== undefined) parts.push(text(`-# ${state.note}`));

	// Worth shouting about: the setup looks complete but every verification would
	// fail at the last step, and Discord gives no warning until it does.
	if (state.roleTooHigh === true) {
		parts.push(
			text(
				"⚠️ **That role sits above mine**, so I cannot give it to anyone. " +
					"Move my role higher in Server Settings → Roles, or pick a lower one.",
			),
		);
	}

	parts.push(
		divider(),
		text(`**The panel says**\n>>> ${config.message}`),
		divider(),
		// Captioned because two stacked menus look identical once something is chosen:
		// the placeholder that told them apart is replaced by the selection.
		text("**Panel channel**\n-# Where members find the Verify button."),
		row(
			channelSelect({
				id: control("channel", ownerId),
				placeholder: "Post the verification panel in…",
				...(config.channelId !== null ? { defaultChannelIds: [config.channelId] } : {}),
			}),
		),
		divider({ spacer: true }),
		text("**Verified role**\n-# Given the moment someone passes."),
		row(
			roleSelect({
				id: control("role", ownerId),
				placeholder: "Give this role once verified…",
				...(config.roleId !== null ? { defaultRoleIds: [config.roleId] } : {}),
			}),
		),
		row(
			button({ id: control("edit", ownerId), label: "Edit the wording" }),
			button({
				id: control("post", ownerId),
				label: config.messageId === null ? "Post the panel" : "Update the panel",
				style: ButtonStyle.Success,
				disabled: !ready,
			}),
			button({
				id: control("off", ownerId),
				label: "Turn off",
				style: ButtonStyle.Danger,
				disabled: !ready && config.messageId === null,
			}),
		),
	);

	return containerMessage(container({ category: "settings", parts }));
}
