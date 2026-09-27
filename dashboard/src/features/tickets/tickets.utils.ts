import { type ChannelSummary, type RoleSummary, type TicketSettings, ticketMissing } from "@testify/shared";
import { type TFunction } from "i18next";
import { problemText } from "@/lib/problemText";

export interface Draft {
	panelChannelId: string | null;
	categoryId: string | null;
	transcriptChannelId: string | null;
	staffRoleId: string | null;
	description: string;
	buttonLabel: string;
}

export function draftOf(settings: TicketSettings): Draft {
	return {
		panelChannelId: settings.panelChannelId,
		categoryId: settings.categoryId,
		transcriptChannelId: settings.transcriptChannelId,
		staffRoleId: settings.staffRoleId,
		description: settings.description,
		buttonLabel: settings.buttonLabel,
	};
}

export function isDirty(draft: Draft, settings: TicketSettings): boolean {
	const saved = draftOf(settings);

	return (Object.keys(saved) as (keyof Draft)[]).some((field) => draft[field] !== saved[field]);
}

/** Everything stopping the panel being posted, all at once, so the fields can be filled in any order. */
export function draftProblems(draft: Draft, t: TFunction): string[] {
	return [
		...ticketMissing(draft).map((missing) => problemText(missing, t)),
		...(draft.description.trim() === "" ? [t("tickets.needsMessage")] : []),
		...(draft.buttonLabel.trim() === "" ? [t("tickets.needsLabel")] : []),
	];
}

export function categoriesOf(channels: ChannelSummary[]): ChannelSummary[] {
	return channels.filter((channel) => channel.kind === "category");
}

/** A ticket channel is created under the category and its permissions are overwritten, so the bot needs the role beneath its own. */
export function staffRoleWarning(roles: RoleSummary[], staffRoleId: string | null, t: TFunction): string | null {
	if (staffRoleId === null) return null;

	const role = roles.find((candidate) => candidate.id === staffRoleId);
	if (role === undefined) return t("tickets.roleGone");
	if (role.managed) return t("tickets.roleManaged", { role: role.name });

	return null;
}
