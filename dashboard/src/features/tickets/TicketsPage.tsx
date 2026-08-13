import { TICKET_LIMITS } from "@testify/shared";
import { Power, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation();
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
				title={t("tickets.title")}
				subtitle={t("tickets.subtitle")}
				action={<SavingIndicator state={savingStateOf(busy, save.isSuccess && !dirty)} />}
			/>

			<Card className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex flex-wrap items-center gap-3">
					<h2 className={CARD_HEADING}>{t("tickets.here")}</h2>
					{settings.enabled ? <Badge tone="success">On</Badge> : <Badge>Off</Badge>}
					{settings.posted && <Badge>{t("tickets.panelPosted")}</Badge>}
				</div>
				<p className="text-muted-foreground text-sm tabular-nums">{settings.openTickets} open right now</p>
			</Card>

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>{t("tickets.whereTitle")}</h2>
					<p className="text-muted-foreground text-sm">{t("tickets.whereBody")}</p>
				</div>

				<ChannelPicker
					label={t("tickets.panelChannel")}
					hint={t("tickets.panelChannelHint")}
					channels={channels.data ?? []}
					value={draft.panelChannelId}
					allowNone={false}
					onChange={(id) => {
						set("panelChannelId", id);
					}}
				/>

				<Field label={t("tickets.category")} htmlFor="ticket-category" hint={t("tickets.categoryHint")}>
					<select
						id="ticket-category"
						className={SELECT}
						value={draft.categoryId ?? ""}
						onChange={(event) => {
							set("categoryId", event.target.value === "" ? null : event.target.value);
						}}
					>
						<option value="">{t("tickets.chooseCategory")}</option>
						{categoriesOf(channels.data ?? []).map((category) => (
							<option key={category.id} value={category.id}>
								{category.name}
							</option>
						))}
					</select>
				</Field>

				<ChannelPicker
					label={t("tickets.transcripts")}
					hint={t("tickets.transcriptsHint")}
					channels={channels.data ?? []}
					value={draft.transcriptChannelId}
					allowNone={false}
					onChange={(id) => {
						set("transcriptChannelId", id);
					}}
				/>

				<Field label={t("tickets.staffRole")} htmlFor="ticket-staff" hint={t("tickets.staffRoleHint")}>
					<select
						id="ticket-staff"
						className={SELECT}
						value={draft.staffRoleId ?? ""}
						onChange={(event) => {
							set("staffRoleId", event.target.value === "" ? null : event.target.value);
						}}
					>
						<option value="">{t("tickets.chooseRole")}</option>
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
					<h2 className={CARD_HEADING}>{t("tickets.panelSays")}</h2>
					<p className="text-muted-foreground text-sm">
						{settings.posted ? t("tickets.postAgain") : t("tickets.nothingPosted")}
					</p>
				</div>

				<Field label={t("tickets.message")} htmlFor="ticket-description">
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

				<Field label={t("tickets.buttonLabel")} htmlFor="ticket-button">
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
					<Warning>{save.error instanceof ApiError ? save.error.message : t("common.couldNotSave")}</Warning>
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
						<Send size={16} aria-hidden="true" /> {settings.posted ? t("tickets.updatePanel") : t("tickets.postPanel")}
					</Button>
				</div>
			</Card>

			{settings.enabled && (
				<Card className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h2 className={CARD_HEADING}>{t("tickets.turnOff")}</h2>
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
				<Warning>{disable.error instanceof ApiError ? disable.error.message : t("common.couldNotSave")}</Warning>
			)}
		</>
	);
}
