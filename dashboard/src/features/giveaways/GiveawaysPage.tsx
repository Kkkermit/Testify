import { GIVEAWAY_LIMITS, giveawayProblem } from "@testify/shared";
import { Gift, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { useUndo } from "@/app/undo";
import {
	ChannelPicker,
	Field,
	FIELD,
	FieldGroup,
	RowActions,
	SavingIndicator,
	savingStateOf,
	SELECT,
	SettingRows,
	Warning,
} from "@/components/form";
import { Button, Card, EmptyState, PageHeader, SectionHeading, Skeleton, Summary } from "@/components/primitives";
import { useMe } from "@/features/auth/useMe";
import { GiveawayRow } from "@/features/giveaways/components/GiveawayRow";
import {
	DURATION_UNITS,
	type DurationUnit,
	durationMsOf,
	giveawayPost,
	nextDraw,
	ordered,
	runningCount,
} from "@/features/giveaways/giveaways.utils";
import {
	useDeleteGiveaway,
	useEndGiveaway,
	useGiveaways,
	useRerollGiveaway,
	useStartGiveaway,
} from "@/features/giveaways/useGiveaways";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { PostPreview } from "@/features/welcome/components/PostPreview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dateAndTime } from "@/lib/datetime";
import { oneOf } from "@/lib/oneOf";
import { problemText } from "@/lib/problemText";
import { sanitiseInput } from "@/lib/sanitise";

export function GiveawaysPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	usePageTitle(t("giveaways.title"), overview.data?.name);
	const list = useGiveaways(guildId);
	const channels = useChannels(guildId);
	const start = useStartGiveaway(guildId);
	const end = useEndGiveaway(guildId);
	const reroll = useRerollGiveaway(guildId);
	const remove = useDeleteGiveaway(guildId);
	const undo = useUndo();
	const me = useMe();

	const [channelId, setChannelId] = useState<string | null>(null);
	const [prize, setPrize] = useState("");
	const [winners, setWinners] = useState(1);
	const [amount, setAmount] = useState(24);
	const [unit, setUnit] = useState<DurationUnit>("hours");

	if (list.isPending) return <Skeleton className="h-96 w-full" />;
	if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;

	const keyOf = (messageId: string): string => `giveaway:${guildId}:${messageId}`;
	const rows = ordered(list.data.giveaways).filter((row) => !undo.isHidden(keyOf(row.messageId)));
	const durationMs = durationMsOf(amount, unit);
	const blocked = problemText(giveawayProblem({ channelId, prize, winnerCount: winners, durationMs }), t);
	const busy = start.isPending || end.isPending || reroll.isPending || remove.isPending;
	const failure = start.error ?? end.error ?? reroll.error ?? remove.error;
	const next = nextDraw(rows);
	const post = giveawayPost({ winnerCount: winners, durationMs }, me.data?.user.username ?? null);

	function create(): void {
		if (blocked !== null || channelId === null) return;
		start.mutate(
			{ channelId, prize: sanitiseInput(prize), winnerCount: winners, durationMs },
			{ onSuccess: () => setPrize("") },
		);
	}

	return (
		<>
			<PageHeader
				server={overview.data}
				title={t("giveaways.title")}
				subtitle={t("giveaways.subtitle")}
				action={<SavingIndicator state={savingStateOf(busy, start.isSuccess)} />}
			/>

			<Summary>
				{next === null
					? t("giveaways.summaryNone")
					: t("giveaways.summaryRunning", { count: runningCount(rows), when: dateAndTime(next) })}
			</Summary>

			<SettingRows title={t("giveaways.start")} description={t("giveaways.startBody")}>
				<ChannelPicker
					label={t("giveaways.channel")}
					channels={channels.data ?? []}
					value={channelId}
					onChange={setChannelId}
					allowNone={false}
				/>

				<Field htmlFor="giveaway-prize" label={t("giveaways.prize")}>
					<input
						id="giveaway-prize"
						value={prize}
						maxLength={GIVEAWAY_LIMITS.maxPrize}
						autoComplete="off"
						placeholder={t("giveaways.prizePlaceholder")}
						onChange={(event) => setPrize(event.target.value)}
						className={FIELD}
					/>
				</Field>

				<Field htmlFor="giveaway-winners" label={t("giveaways.winners")}>
					<input
						id="giveaway-winners"
						type="number"
						inputMode="numeric"
						min={GIVEAWAY_LIMITS.minWinners}
						max={GIVEAWAY_LIMITS.maxWinners}
						value={winners}
						onChange={(event) => setWinners(Number(event.target.value))}
						className={cn(FIELD, "max-w-32 tabular-nums")}
					/>
				</Field>

				<Field htmlFor="giveaway-amount" label={t("giveaways.runsFor")}>
					<div className="flex max-w-80 gap-2">
						<input
							id="giveaway-amount"
							type="number"
							inputMode="numeric"
							min={1}
							value={amount}
							onChange={(event) => setAmount(Number(event.target.value))}
							className={cn(FIELD, "tabular-nums")}
						/>
						<select
							aria-label={t("giveaways.durationUnit")}
							value={unit}
							onChange={(event) =>
								setUnit(
									oneOf(
										DURATION_UNITS.map((entry) => entry.value),
										event.target.value,
										"hours",
									),
								)
							}
							className={SELECT}
						>
							{DURATION_UNITS.map((entry) => (
								<option key={entry.value} value={entry.value}>
									{t(entry.labelKey)}
								</option>
							))}
						</select>
					</div>
				</Field>

				<FieldGroup label={t("common.preview")}>
					<PostPreview text={post.content}>
						<div className="border-primary bg-card rounded-r-field mt-2 flex flex-col gap-1 border-l-4 p-3">
							<p className={cn("font-semibold", prize.trim() === "" && "text-muted-foreground")}>
								{prize.trim() === "" ? t("giveaways.prizePlaceholder") : prize}
							</p>
							{post.lines.map((line) => (
								<p key={line}>{line}</p>
							))}
							<p className="text-muted-foreground mt-1 text-xs">{post.footer}</p>
						</div>
					</PostPreview>
				</FieldGroup>

				{blocked !== null && prize !== "" && <Warning>{blocked}</Warning>}
				{failure !== null && (
					<Warning>{failure instanceof ApiError ? failure.message : t("common.couldNotSave")}</Warning>
				)}

				<RowActions>
					<Button disabled={blocked !== null || busy} onClick={create}>
						<Plus size={15} aria-hidden="true" />
						{t("giveaways.startIt")}
					</Button>
				</RowActions>
			</SettingRows>

			<section aria-labelledby="giveaways-heading" className="flex flex-col gap-3">
				<SectionHeading
					as="h2"
					id="giveaways-heading"
					count={t("giveaways.runningCount", { count: runningCount(rows) })}
				>
					{t("giveaways.inThisServer")}
				</SectionHeading>

				{rows.length === 0 ? (
					<Card>
						<EmptyState icon={<Gift size={28} />} title={t("giveaways.emptyTitle")} body={t("giveaways.emptyBody")} />
					</Card>
				) : (
					<ul className="flex flex-col gap-3">
						{rows.map((row) => (
							<GiveawayRow
								key={row.messageId}
								row={row}
								channels={channels.data ?? []}
								busy={busy}
								onEnd={() => end.mutate(row.messageId)}
								onReroll={() => reroll.mutate(row.messageId)}
								onDelete={() => {
									undo.schedule({
										key: keyOf(row.messageId),
										label: t("undo.giveaway", { prize: row.prize }),
										commit: () => remove.mutateAsync(row.messageId),
									});
								}}
							/>
						))}
					</ul>
				)}
			</section>
		</>
	);
}
