import { ButtonStyle, type Guild } from "discord.js";
import { customId } from "@core/button";
import { UserFacingError } from "@core/errors";
import { type TicketSetupRecord } from "@database/models/tickets.schema";
import { countOpenTickets, getTicketSetup, saveTicketSetup } from "@database/repositories/ticketRepository";
import { button, row } from "@lib/components.util";
import { embed } from "@lib/embeds.util";
import { type TicketPatch, type TicketSettings, ticketBlocked } from "@testify/shared";

const DEFAULT_DESCRIPTION = "Press the button below and we will be with you shortly.";
const DEFAULT_LABEL = "Create ticket";

/** `messageId` was added after the first records were written, so it is absent rather than null on those. */
export type StoredTicketSetup = Omit<TicketSetupRecord, "messageId"> & { messageId?: string | null };

export function normaliseTicketSetup(setup: StoredTicketSetup | null, openTickets = 0): TicketSettings {
	return {
		enabled: setup !== null,
		panelChannelId: setup?.channelId ?? null,
		categoryId: setup?.categoryId ?? null,
		transcriptChannelId: setup?.transcriptChannelId ?? null,
		staffRoleId: setup?.handlerRoleId ?? null,
		description: setup?.description ?? DEFAULT_DESCRIPTION,
		buttonLabel: setup?.buttonLabel ?? DEFAULT_LABEL,
		posted: (setup?.messageId ?? null) !== null,
		openTickets,
	};
}

export async function readTickets(guild: Guild): Promise<TicketSettings> {
	const [setup, open] = await Promise.all([getTicketSetup(guild.id), countOpenTickets(guild.id)]);

	return normaliseTicketSetup(setup, open);
}

/** Posts the panel, or edits the one already there, and answers with the message it left behind. */
export async function publishTicketPanel(
	guild: Guild,
	settings: TicketSettings,
	existingMessageId: string | null = null,
): Promise<string> {
	if (settings.panelChannelId === null) throw new UserFacingError("Choose a channel first.");

	const channel = await guild.channels.fetch(settings.panelChannelId).catch(() => null);
	if (channel?.isSendable() !== true) {
		throw new UserFacingError("I cannot post in that channel any more. Pick another one.");
	}

	const payload = {
		embeds: [embed({ category: "tickets", title: "Need a hand?", description: settings.description })],
		components: [
			row(
				button({
					id: customId("ticket", "open"),
					label: settings.buttonLabel,
					emoji: "🎫",
					style: ButtonStyle.Primary,
				}),
			),
		],
	};

	if (existingMessageId !== null) {
		const already = await channel.messages.fetch(existingMessageId).catch(() => null);
		if (already !== null) {
			await already.edit(payload);
			return already.id;
		}
	}

	return (await channel.send(payload)).id;
}

/** Merges onto a fresh read, so two admins editing at once cannot overwrite each other's untouched fields. */
export async function applyTickets(
	guild: Guild,
	patch: TicketPatch,
	everyoneRoleId: string,
): Promise<{ settings: TicketSettings } | { problem: string }> {
	const current = await readTickets(guild);
	const next: TicketSettings = {
		...current,
		panelChannelId: patch.panelChannelId ?? current.panelChannelId,
		categoryId: patch.categoryId ?? current.categoryId,
		transcriptChannelId: patch.transcriptChannelId ?? current.transcriptChannelId,
		staffRoleId: patch.staffRoleId ?? current.staffRoleId,
		description: patch.description ?? current.description,
		buttonLabel: patch.buttonLabel ?? current.buttonLabel,
	};

	const problem = ticketBlocked(next);
	if (problem !== null) return { problem };

	// A panel posted in the old channel is not the panel in the new one, so its id cannot carry over.
	const moved = patch.panelChannelId !== undefined && patch.panelChannelId !== current.panelChannelId;
	const existing = moved ? null : ((await getTicketSetup(guild.id))?.messageId ?? null);
	const messageId = patch.publish === true ? await publishTicketPanel(guild, next, existing) : existing;

	await saveTicketSetup(guild.id, {
		channelId: next.panelChannelId ?? "",
		categoryId: next.categoryId ?? "",
		transcriptChannelId: next.transcriptChannelId ?? "",
		handlerRoleId: next.staffRoleId ?? "",
		everyoneRoleId,
		description: next.description,
		buttonLabel: next.buttonLabel,
		buttonEmoji: "🎫",
		messageId,
	});

	return { settings: { ...next, enabled: true, posted: messageId !== null } };
}
