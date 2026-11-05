import { TREASURE_LIMITS } from "@testify/shared";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { RowActions, SavingIndicator, savingStateOf, SettingRows, Toggle, Warning } from "@/components/form";
import { Button, PageHeader, Skeleton, Summary } from "@/components/primitives";
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

	usePageTitle(t("treasure.title"), overview.data?.name);

	const settings = treasure.data;
	const [draft, setDraft] = useState<Draft | null>(null);

	useEffect(() => {
		if (settings !== undefined) setDraft(draftOf(settings));
	}, [settings]);

	if (treasure.isError) return <ErrorState error={treasure.error} onRetry={() => void treasure.refetch()} />;
	if (treasure.isPending || draft === null) return <Skeleton className="h-96 w-full" />;
	if (settings === undefined) return <Skeleton className="h-96 w-full" />;

	const problem = draftProblem(draft, t);
	const dirty = isDirty(draft, settings);
	const busy = save.isPending || reset.isPending;

	function set(field: keyof Draft, value: number): void {
		setDraft((current) => (current === null ? current : { ...current, [field]: value }));
	}

	return (
		<>
			<PageHeader
				server={overview.data}
				title={t("treasure.title")}
				subtitle={t("treasure.subtitle")}
				action={<SavingIndicator state={savingStateOf(busy, save.isSuccess)} />}
			/>

			<Summary>
				{!settings.configured
					? t("treasure.notSetUpYet")
					: settings.enabled
						? describeRate(draftOf(settings), t)
						: t("treasure.summaryOff")}
			</Summary>

			<SettingRows>
				<Toggle
					label={t("treasure.enable")}
					checked={settings.enabled}
					disabled={busy}
					onChange={(enabled) => {
						save.mutate({ enabled });
					}}
				/>
			</SettingRows>

			<SettingRows title={t("treasure.howOften")} description={t("treasure.howBody")}>
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

				{problem !== null && <Warning>{problem}</Warning>}
				{save.error !== null && (
					<Warning>{save.error instanceof ApiError ? save.error.message : t("common.couldNotSave")}</Warning>
				)}

				<RowActions>
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
						{t("common.saveChanges")}
					</Button>

					<Button
						variant="ghost"
						disabled={busy}
						onClick={() => {
							reset.mutate();
						}}
					>
						<RotateCcw size={16} aria-hidden="true" /> {t("treasure.resetDefaults")}
					</Button>
				</RowActions>
			</SettingRows>

			{reset.error !== null && (
				<Warning>{reset.error instanceof ApiError ? reset.error.message : t("common.couldNotReset")}</Warning>
			)}
		</>
	);
}
