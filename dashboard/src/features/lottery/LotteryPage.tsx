import { LOTTERY_FREQUENCIES, LOTTERY_LIMITS, type LotteryFrequency } from "@testify/shared";
import { Coins, Snowflake, Ticket, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { ChannelPicker, Field, FIELD, SavingIndicator, savingStateOf, SELECT, Warning } from "@/components/form";
import { Badge, Button, Card, PageHeader, Skeleton, StatTile } from "@/components/primitives";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { DrawHistory } from "@/features/lottery/components/DrawHistory";
import {
	type Draft,
	draftOf,
	draftProblem,
	isDirty,
	reschedules,
	winnersWarning,
} from "@/features/lottery/lottery.utils";
import { useEndLottery, useLottery, useSaveLottery } from "@/features/lottery/useLottery";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

export function LotteryPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const lottery = useLottery(guildId);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveLottery(guildId);
	const end = useEndLottery(guildId);

	usePageTitle("Lottery", overview.data?.name);

	const settings = lottery.data;
	const [draft, setDraft] = useState<Draft | null>(null);
	const [confirming, setConfirming] = useState(false);

	useEffect(() => {
		if (settings !== undefined) setDraft(draftOf(settings));
	}, [settings]);

	if (lottery.isError) return <ErrorState error={lottery.error} onRetry={() => void lottery.refetch()} />;
	if (lottery.isPending || draft === null) return <Skeleton className="h-96 w-full" />;
	if (settings === undefined) return <Skeleton className="h-96 w-full" />;

	const problem = draftProblem(draft);
	const dirty = isDirty(draft, settings);
	const busy = save.isPending || end.isPending;
	const warning = winnersWarning(draft, settings);

	function set<K extends keyof Draft>(field: K, value: Draft[K]): void {
		setDraft((current) => (current === null ? current : { ...current, [field]: value }));
	}

	return (
		<>
			<PageHeader
				eyebrow={overview.data?.name}
				title={t("lottery.title")}
				subtitle={t("lottery.subtitle")}
				action={<SavingIndicator state={savingStateOf(busy, save.isSuccess && !dirty)} />}
			/>

			<Card className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex flex-wrap items-center gap-3">
					<h2 className={CARD_HEADING}>{t("lottery.here")}</h2>
					{!settings.enabled && <Badge>{t("lottery.notRunning")}</Badge>}
					{settings.enabled && settings.frozen && <Badge tone="warning">{t("lottery.frozen")}</Badge>}
					{settings.enabled && !settings.frozen && <Badge tone="success">{t("lottery.running")}</Badge>}
				</div>

				{settings.enabled && (
					<Button
						variant="ghost"
						disabled={busy}
						onClick={() => {
							save.mutate({ frozen: !settings.frozen });
						}}
					>
						<Snowflake size={16} aria-hidden="true" /> {settings.frozen ? "Unfreeze" : "Freeze"}
					</Button>
				)}
			</Card>

			{settings.enabled && (
				<div className="grid gap-4 sm:grid-cols-3">
					<StatTile icon={Coins} label={t("lottery.prizePool")} value={settings.prizePool} />
					<StatTile icon={Ticket} label={t("lottery.ticketsSold")} value={settings.ticketsSold} />
					<StatTile icon={Users} label={t("lottery.entrants")} value={settings.entrants} />
				</div>
			)}

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>{t("lottery.howTitle")}</h2>
					<p className="text-muted-foreground text-sm">
						Members buy tickets with <code>/lottery enter</code>. Every ticket adds its fee to the pot.
					</p>
				</div>

				<ChannelPicker
					label={t("lottery.announcements")}
					hint={t("lottery.announcementsHint")}
					channels={channels.data ?? []}
					value={draft.announcementChannelId}
					allowNone={false}
					onChange={(id) => {
						set("announcementChannelId", id);
					}}
				/>

				<Field label={t("lottery.draw")} htmlFor="lottery-frequency" hint={t("lottery.drawHint")}>
					<select
						id="lottery-frequency"
						className={cn(SELECT, "max-w-48")}
						value={draft.frequency}
						onChange={(event) => {
							set("frequency", event.target.value as LotteryFrequency);
						}}
					>
						{LOTTERY_FREQUENCIES.map((frequency) => (
							<option key={frequency} value={frequency}>
								{frequency}
							</option>
						))}
					</select>
				</Field>

				<div className="grid gap-4 sm:grid-cols-3">
					<Field label={t("lottery.ticketPrice")} htmlFor="lottery-fee">
						<input
							id="lottery-fee"
							type="number"
							inputMode="numeric"
							min={LOTTERY_LIMITS.minEntryFee}
							max={LOTTERY_LIMITS.maxEntryFee}
							value={draft.entryFee}
							onChange={(event) => {
								set("entryFee", Number(event.target.value));
							}}
							className={cn(FIELD, "tabular-nums")}
						/>
					</Field>

					<Field label={t("lottery.winnersADraw")} htmlFor="lottery-winners">
						<input
							id="lottery-winners"
							type="number"
							inputMode="numeric"
							min={LOTTERY_LIMITS.minWinners}
							max={LOTTERY_LIMITS.maxWinners}
							value={draft.maxWinners}
							onChange={(event) => {
								set("maxWinners", Number(event.target.value));
							}}
							className={cn(FIELD, "tabular-nums")}
						/>
					</Field>

					<Field label={t("lottery.startingPot")} htmlFor="lottery-base" hint={t("lottery.startingPotHint")}>
						<input
							id="lottery-base"
							type="number"
							inputMode="numeric"
							min={LOTTERY_LIMITS.minBasePool}
							max={LOTTERY_LIMITS.maxBasePool}
							value={draft.basePrizePool}
							onChange={(event) => {
								set("basePrizePool", Number(event.target.value));
							}}
							className={cn(FIELD, "tabular-nums")}
						/>
					</Field>
				</div>

				{warning !== null && <Warning>{warning}</Warning>}
				{reschedules(draft, settings) && settings.enabled && (
					<Warning>Saving this moves the next draw to one {draft.frequency.replace(/ly$/, "")} from now.</Warning>
				)}
				{problem !== null && <Warning>{problem}</Warning>}
				{save.error !== null && (
					<Warning>{save.error instanceof ApiError ? save.error.message : t("common.couldNotSave")}</Warning>
				)}

				<div>
					<Button
						disabled={!dirty || problem !== null || busy}
						onClick={() => {
							save.mutate({
								entryFee: draft.entryFee,
								basePrizePool: draft.basePrizePool,
								maxWinners: draft.maxWinners,
								frequency: draft.frequency,
								...(draft.announcementChannelId === null ? {} : { announcementChannelId: draft.announcementChannelId }),
							});
						}}
					>
						{settings.enabled ? "Save changes" : t("lottery.start")}
					</Button>
				</div>
			</Card>

			<DrawHistory draws={settings.history} nextDrawAt={settings.enabled ? settings.nextDrawAt : null} />

			{settings.enabled && (
				<Card className="flex flex-col gap-3">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div>
							<h2 className={CARD_HEADING}>{t("lottery.endIt")}</h2>
							<p className="text-muted-foreground text-sm">
								The pot of {settings.prizePool.toLocaleString()} goes with it, and nobody is refunded.
							</p>
						</div>

						<Button
							variant="ghost"
							disabled={busy}
							onClick={() => {
								setConfirming((was) => !was);
							}}
						>
							<Trash2 size={16} aria-hidden="true" /> End it
						</Button>
					</div>

					{confirming && (
						<div className="flex flex-wrap items-center gap-3">
							<Warning>{t("lottery.cannotUndo")}</Warning>
							<Button
								variant="destructive"
								disabled={busy}
								onClick={() => {
									end.mutate();
									setConfirming(false);
								}}
							>
								Yes, end it
							</Button>
						</div>
					)}
				</Card>
			)}

			{end.error !== null && (
				<Warning>{end.error instanceof ApiError ? end.error.message : t("common.couldNotEnd")}</Warning>
			)}
		</>
	);
}
