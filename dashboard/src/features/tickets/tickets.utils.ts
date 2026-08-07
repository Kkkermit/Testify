import { type ChannelSummary, type RoleSummary, type TicketSettings, ticketBlocked } from "@testify/shared";

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

/** Why the panel cannot be posted yet, in the words the form shows. */
export function draftProblem(draft: Draft): string | null {
	if (draft.description.trim() === "") return "The panel needs something to say.";
	if (draft.buttonLabel.trim() === "") return "The button needs a label.";

	return ticketBlocked(draft);
}

export function categoriesOf(channels: ChannelSummary[]): ChannelSummary[] {
	return channels.filter((channel) => channel.kind === "category");
}

/** A ticket channel is created under the category and its permissions are overwritten, so the bot needs the role beneath its own. */
export function staffRoleWarning(roles: RoleSummary[], staffRoleId: string | null): string | null {
	if (staffRoleId === null) return null;

	const role = roles.find((candidate) => candidate.id === staffRoleId);
	if (role === undefined) return "That role no longer exists. Pick another one.";
	if (role.managed) return `${role.name} is managed by an integration, so Testify cannot use it here.`;

	return null;
}
