import { GIVEAWAY_LIMITS, giveawayProblem } from "@testify/shared";
import { Gift, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { ChannelPicker, Field, FIELD, SavingIndicator, savingStateOf, SELECT, Warning } from "@/components/form";
import { Button, Card, EmptyState, Eyebrow, PageHeader, Skeleton } from "@/components/primitives";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { GiveawayRow } from "@/features/giveaways/components/GiveawayRow";
import {
	DURATION_UNITS,
	type DurationUnit,
	durationMsOf,
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
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { sanitiseInput } from "@/lib/sanitise";

export function GiveawaysPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	usePageTitle("Giveaways");

	const overview = useGuildOverview(guildId);
	const list = useGiveaways(guildId);
	const channels = useChannels(guildId);
	const start = useStartGiveaway(guildId);
	const end = useEndGiveaway(guildId);
	const reroll = useRerollGiveaway(guildId);
	const remove = useDeleteGiveaway(guildId);

	const [channelId, setChannelId] = useState<string | null>(null);
	const [prize, setPrize] = useState("");
	const [winners, setWinners] = useState(1);
	const [amount, setAmount] = useState(24);
	const [unit, setUnit] = useState<DurationUnit>("hours");

	if (list.isPending) return <Skeleton className="h-96 w-full" />;
	if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;

	const rows = ordered(list.data.giveaways);
	const durationMs = durationMsOf(amount, unit);
	const blocked = giveawayProblem({ channelId, prize, winnerCount: winners, durationMs });
	const busy = start.isPending || end.isPending || reroll.isPending || remove.isPending;
	const failure = start.error ?? end.error ?? reroll.error ?? remove.error;

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
				eyebrow={overview.data?.name}
				title={t("giveaways.title")}
				subtitle={t("giveaways.subtitle")}
				action={<SavingIndicator state={savingStateOf(busy, start.isSuccess)} />}
			/>

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>{t("giveaways.start")}</h2>
					<p className="text-muted-foreground text-sm">
						Testify posts it and draws the winners when the time is up. Members enter with the 🎉 reaction.
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
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
							className={FIELD}
						/>
					</Field>

					<Field htmlFor="giveaway-amount" label={t("giveaways.runsFor")}>
						<div className="flex gap-2">
							<input
								id="giveaway-amount"
								type="number"
								inputMode="numeric"
								min={1}
								value={amount}
								onChange={(event) => setAmount(Number(event.target.value))}
								className={FIELD}
							/>
							<select
								aria-label={t("giveaways.durationUnit")}
								value={unit}
								onChange={(event) => setUnit(event.target.value as DurationUnit)}
								className={SELECT}
							>
								{DURATION_UNITS.map((entry) => (
									<option key={entry.value} value={entry.value}>
										{entry.label}
									</option>
								))}
							</select>
						</div>
					</Field>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<Button disabled={blocked !== null || busy} onClick={create}>
						<Plus size={15} aria-hidden="true" />
						Start it
					</Button>
					{blocked !== null && prize !== "" && <Warning>{blocked}</Warning>}
				</div>

				{failure !== null && (
					<Warning>{failure instanceof ApiError ? failure.message : t("common.couldNotSave")}</Warning>
				)}
			</Card>

			<section aria-labelledby="giveaways-heading" className="flex flex-col gap-3">
				<Eyebrow as="h2" id="giveaways-heading" count={`${String(runningCount(rows))} running`}>
					In this server
				</Eyebrow>

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
								onDelete={() => remove.mutate(row.messageId)}
							/>
						))}
					</ul>
				)}
			</section>
		</>
	);
}
