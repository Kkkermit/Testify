import { TICKET_LIMITS } from "@testify/shared";
import { Power, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { ChannelPicker, Field, FIELD, SavingIndicator, savingStateOf, SELECT, Warning } from "@/components/form";
import { Badge, Button, Card, PageHeader, Skeleton } from "@/components/primitives";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels, useRoles } from "@/features/levelling/useLevelling";
import {
	categoriesOf,
	type Draft,
	draftOf,
	draftProblem,
	isDirty,
	staffRoleWarning,
} from "@/features/tickets/tickets.utils";
import { useDisableTickets, useSaveTickets, useTickets } from "@/features/tickets/useTickets";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { markupWarning, sanitiseInput } from "@/lib/sanitise";

export function TicketsPage(): React.JSX.Element {
	const { guildId = "" } = useParams();

	const tickets = useTickets(guildId);
	const channels = useChannels(guildId);
	const roles = useRoles(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveTickets(guildId);
	const disable = useDisableTickets(guildId);

	usePageTitle("Tickets", overview.data?.name);

	const settings = tickets.data;
	const [draft, setDraft] = useState<Draft | null>(null);

	useEffect(() => {
		if (settings !== undefined) setDraft(draftOf(settings));
	}, [settings]);

	if (tickets.isError) return <ErrorState error={tickets.error} onRetry={() => void tickets.refetch()} />;
	if (tickets.isPending || draft === null) return <Skeleton className="h-96 w-full" />;
	if (settings === undefined) return <Skeleton className="h-96 w-full" />;

	const problem = draftProblem(draft);
	const dirty = isDirty(draft, settings);
	const busy = save.isPending || disable.isPending;
	const roleProblem = staffRoleWarning(roles.data ?? [], draft.staffRoleId);

	function set<K extends keyof Draft>(field: K, value: Draft[K]): void {
		setDraft((current) => (current === null ? current : { ...current, [field]: value }));
	}

	function patch(publish = false): void {
		if (draft === null) return;
		save.mutate({
			panelChannelId: draft.panelChannelId ?? undefined,
			categoryId: draft.categoryId ?? undefined,
			transcriptChannelId: draft.transcriptChannelId ?? undefined,
			staffRoleId: draft.staffRoleId ?? undefined,
			description: sanitiseInput(draft.description),
			buttonLabel: sanitiseInput(draft.buttonLabel),
			...(publish ? { publish: true } : {}),
		});
	}

	return (
		<>
			<PageHeader
				eyebrow={overview.data?.name}
				title="Tickets"
				subtitle="A button members press to open a private channel with your staff."
				action={<SavingIndicator state={savingStateOf(busy, save.isSuccess && !dirty)} />}
			/>

			<Card className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex flex-wrap items-center gap-3">
					<h2 className={CARD_HEADING}>Tickets in this server</h2>
					{settings.enabled ? <Badge tone="success">On</Badge> : <Badge>Off</Badge>}
					{settings.posted && <Badge>Panel posted</Badge>}
				</div>
				<p className="text-muted-foreground text-sm tabular-nums">{settings.openTickets} open right now</p>
			</Card>

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>Where tickets live</h2>
					<p className="text-muted-foreground text-sm">All four are needed before the panel can be posted.</p>
				</div>

				<ChannelPicker
					label="Panel channel"
					hint="Where members find the button."
					channels={channels.data ?? []}
					value={draft.panelChannelId}
					allowNone={false}
					onChange={(id) => {
						set("panelChannelId", id);
					}}
				/>

				<Field label="Category" htmlFor="ticket-category" hint="New ticket channels are created under this.">
					<select
						id="ticket-category"
						className={SELECT}
						value={draft.categoryId ?? ""}
						onChange={(event) => {
							set("categoryId", event.target.value === "" ? null : event.target.value);
						}}
					>
						<option value="">Choose a category</option>
						{categoriesOf(channels.data ?? []).map((category) => (
							<option key={category.id} value={category.id}>
								{category.name}
							</option>
						))}
					</select>
				</Field>

				<ChannelPicker
					label="Transcripts"
					hint="Where a closed ticket’s transcript is sent."
					channels={channels.data ?? []}
					value={draft.transcriptChannelId}
					allowNone={false}
					onChange={(id) => {
						set("transcriptChannelId", id);
					}}
				/>

				<Field label="Staff role" htmlFor="ticket-staff" hint="The role that can see and handle every ticket.">
					<select
						id="ticket-staff"
						className={SELECT}
						value={draft.staffRoleId ?? ""}
						onChange={(event) => {
							set("staffRoleId", event.target.value === "" ? null : event.target.value);
						}}
					>
						<option value="">Choose a role</option>
						{(roles.data ?? []).map((role) => (
							<option key={role.id} value={role.id}>
								{role.name}
							</option>
						))}
					</select>
				</Field>

				{roleProblem !== null && <Warning>{roleProblem}</Warning>}
			</Card>

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>What the panel says</h2>
					<p className="text-muted-foreground text-sm">
						{settings.posted
							? "Posting again edits the panel already out there rather than leaving a second one."
							: "Nothing is posted until you press the button below."}
					</p>
				</div>

				<Field label="Message" htmlFor="ticket-description">
					<textarea
						id="ticket-description"
						rows={3}
						value={draft.description}
						maxLength={TICKET_LIMITS.maxDescription}
						onChange={(event) => {
							set("description", event.target.value);
						}}
						className={cn(FIELD, "resize-y")}
					/>
				</Field>

				<Field label="Button label" htmlFor="ticket-button">
					<input
						id="ticket-button"
						value={draft.buttonLabel}
						maxLength={TICKET_LIMITS.maxButtonLabel}
						onChange={(event) => {
							set("buttonLabel", event.target.value);
						}}
						className={cn(FIELD, "max-w-64")}
					/>
				</Field>

				{markupWarning(draft.description) !== null && <Warning>{markupWarning(draft.description)}</Warning>}
				{problem !== null && <Warning>{problem}</Warning>}
				{save.error !== null && (
					<Warning>{save.error instanceof ApiError ? save.error.message : "That could not be saved."}</Warning>
				)}

				<div className="flex flex-wrap items-center gap-3">
					<Button
						disabled={!dirty || problem !== null || busy}
						onClick={() => {
							patch();
						}}
					>
						Save changes
					</Button>

					<Button
						variant="secondary"
						disabled={problem !== null || busy}
						onClick={() => {
							patch(true);
						}}
					>
						<Send size={16} aria-hidden="true" /> {settings.posted ? "Update the panel" : "Post the panel"}
					</Button>
				</div>
			</Card>

			{settings.enabled && (
				<Card className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h2 className={CARD_HEADING}>Turn tickets off</h2>
						<p className="text-muted-foreground text-sm">
							Open ticket channels are left alone. The panel message has to be deleted by hand.
						</p>
					</div>

					<Button
						variant="ghost"
						disabled={busy}
						onClick={() => {
							disable.mutate();
						}}
					>
						<Power size={16} aria-hidden="true" /> Turn off
					</Button>
				</Card>
			)}

			{disable.error !== null && (
				<Warning>{disable.error instanceof ApiError ? disable.error.message : "That could not be turned off."}</Warning>
			)}
		</>
	);
}
