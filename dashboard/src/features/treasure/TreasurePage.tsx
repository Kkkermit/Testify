import { TREASURE_LIMITS } from "@testify/shared";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { SavingIndicator, savingStateOf, Toggle, Warning } from "@/components/form";
import { Button, Card, PageHeader, Skeleton } from "@/components/primitives";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { NumberField } from "@/features/treasure/components/NumberField";
import {
	type Draft,
	describeRate,
	draftOf,
	draftProblem,
	isDirty,
	toMilliseconds,
} from "@/features/treasure/treasure.utils";
import { useResetTreasure, useSaveTreasure, useTreasure } from "@/features/treasure/useTreasure";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";

export function TreasurePage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const treasure = useTreasure(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveTreasure(guildId);
	const reset = useResetTreasure(guildId);

	usePageTitle("Treasure drops", overview.data?.name);

	const settings = treasure.data;
	const [draft, setDraft] = useState<Draft | null>(null);

	useEffect(() => {
		if (settings !== undefined) setDraft(draftOf(settings));
	}, [settings]);

	if (treasure.isError) return <ErrorState error={treasure.error} onRetry={() => void treasure.refetch()} />;
	if (treasure.isPending || draft === null) return <Skeleton className="h-96 w-full" />;
	if (settings === undefined) return <Skeleton className="h-96 w-full" />;

	const problem = draftProblem(draft);
	const dirty = isDirty(draft, settings);
	const busy = save.isPending || reset.isPending;

	function set(field: keyof Draft, value: number): void {
		setDraft((current) => (current === null ? current : { ...current, [field]: value }));
	}

	return (
		<>
			<PageHeader
				eyebrow={overview.data?.name}
				title={t("treasure.title")}
				subtitle={t("treasure.subtitle")}
				action={<SavingIndicator state={savingStateOf(busy, save.isSuccess)} />}
			/>

			<Card className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h2 className={CARD_HEADING}>{t("treasure.dropsHere")}</h2>
					<p className="text-muted-foreground text-sm">
						{settings.configured
							? describeRate(draftOf(settings))
							: "Not set up yet — the numbers below are the defaults until you turn drops on."}
					</p>
				</div>

				<Toggle
					label={t("treasure.enable")}
					checked={settings.enabled}
					disabled={busy}
					onChange={(enabled) => {
						save.mutate({ enabled });
					}}
				/>
			</Card>

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>{t("treasure.howOften")}</h2>
					<p className="text-muted-foreground text-sm">
						Testify picks a number in each range, so drops do not land on a predictable beat.
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<NumberField
						id="treasure-min-messages"
						label={t("treasure.fewest")}
						value={draft.minMessages}
						min={TREASURE_LIMITS.minMessages}
						max={TREASURE_LIMITS.maxMessages}
						onChange={(value) => {
							set("minMessages", value);
						}}
					/>
					<NumberField
						id="treasure-max-messages"
						label={t("treasure.most")}
						value={draft.maxMessages}
						min={TREASURE_LIMITS.minMessages}
						max={TREASURE_LIMITS.maxMessages}
						onChange={(value) => {
							set("maxMessages", value);
						}}
					/>
					<NumberField
						id="treasure-min-amount"
						label={t("treasure.smallest")}
						value={draft.minAmount}
						min={TREASURE_LIMITS.minAmount}
						max={TREASURE_LIMITS.maxAmount}
						onChange={(value) => {
							set("minAmount", value);
						}}
					/>
					<NumberField
						id="treasure-max-amount"
						label={t("treasure.largest")}
						value={draft.maxAmount}
						min={TREASURE_LIMITS.minAmount}
						max={TREASURE_LIMITS.maxAmount}
						onChange={(value) => {
							set("maxAmount", value);
						}}
					/>
					<NumberField
						id="treasure-cooldown"
						label={t("treasure.cooldown")}
						hint={t("treasure.cooldownHint")}
						value={draft.cooldownMinutes}
						min={TREASURE_LIMITS.minCooldownMinutes}
						max={TREASURE_LIMITS.maxCooldownMinutes}
						onChange={(value) => {
							set("cooldownMinutes", value);
						}}
					/>
				</div>

				{problem !== null && <Warning>{problem}</Warning>}
				{save.error !== null && (
					<Warning>{save.error instanceof ApiError ? save.error.message : "That could not be saved."}</Warning>
				)}

				<div className="flex flex-wrap items-center gap-3">
					<Button
						disabled={!dirty || problem !== null || busy}
						onClick={() => {
							save.mutate({
								minMessages: draft.minMessages,
								maxMessages: draft.maxMessages,
								minAmount: draft.minAmount,
								maxAmount: draft.maxAmount,
								cooldownMs: toMilliseconds(draft.cooldownMinutes),
							});
						}}
					>
						Save changes
					</Button>

					<Button
						variant="ghost"
						disabled={busy}
						onClick={() => {
							reset.mutate();
						}}
					>
						<RotateCcw size={16} aria-hidden="true" /> Reset to defaults
					</Button>
				</div>
			</Card>

			{reset.error !== null && (
				<Warning>{reset.error instanceof ApiError ? reset.error.message : "That could not be reset."}</Warning>
			)}
		</>
	);
}
