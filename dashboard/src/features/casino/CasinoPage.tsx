import { CASINO_GAMES } from "@testify/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import {
	Field,
	FIELD,
	RowActions,
	SavingIndicator,
	savingStateOf,
	SettingRows,
	Toggle,
	Warning,
} from "@/components/form";
import { Button, PageHeader, Skeleton, Summary } from "@/components/primitives";
import {
	draftOf,
	GAME_HINTS,
	GAME_LABELS,
	isDirty,
	type LimitsDraft,
	limitsOf,
	limitsProblem,
	openGames,
} from "@/features/casino/casino.utils";
import { useCasino, useSaveCasino } from "@/features/casino/useCasino";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

export function CasinoPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const casino = useCasino(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveCasino(guildId);

	usePageTitle(t("casino.title"), overview.data?.name);

	const settings = casino.data;
	const [draft, setDraft] = useState<LimitsDraft | null>(null);
	const [source, setSource] = useState<"state" | "games" | "limits">("state");

	useEffect(() => {
		if (settings !== undefined) setDraft(draftOf(settings));
	}, [settings]);

	// Checked before the draft, which never fills when the read fails.
	if (casino.isError) return <ErrorState error={casino.error} onRetry={() => void casino.refetch()} />;
	if (settings === undefined || draft === null) return <Skeleton className="h-96 w-full" />;

	const problem = limitsProblem(draft, t);
	const limits = limitsOf(draft);
	const refusal = (from: typeof source): React.JSX.Element | null =>
		save.error !== null && source === from ? (
			<Warning>{save.error instanceof ApiError ? save.error.message : t("common.couldNotSave")}</Warning>
		) : null;

	return (
		<>
			<PageHeader
				server={overview.data}
				title={t("casino.title")}
				subtitle={t("casino.subtitle")}
				action={<SavingIndicator state={savingStateOf(save.isPending, save.isSuccess)} />}
			/>

			<Summary>
				{settings.enabled
					? t("casino.stateOpen", { open: openGames(settings), total: CASINO_GAMES.length })
					: t("casino.stateClosed")}
			</Summary>

			<SettingRows>
				<Toggle
					label={t("casino.enable")}
					checked={settings.enabled}
					disabled={save.isPending}
					onChange={(enabled) => {
						setSource("state");
						save.mutate({ enabled });
					}}
				/>
				{refusal("state")}
			</SettingRows>

			<SettingRows
				title={t("casino.games")}
				description={settings.enabled ? t("casino.gamesBody") : t("casino.gamesClosed")}
			>
				{CASINO_GAMES.map((game) => (
					<Toggle
						key={game}
						label={t(GAME_LABELS[game])}
						hint={t(GAME_HINTS[game])}
						checked={settings.games[game]}
						disabled={!settings.enabled || save.isPending}
						onChange={(on) => {
							setSource("games");
							save.mutate({ games: { [game]: on } });
						}}
					/>
				))}
				{refusal("games")}
			</SettingRows>

			<SettingRows title={t("casino.limits")} description={t("casino.limitsBody")}>
				<Field label={t("casino.minBet")} hint={t("casino.minHint")} htmlFor="casino-min-bet">
					<input
						id="casino-min-bet"
						type="number"
						inputMode="numeric"
						min={1}
						value={draft.min}
						onChange={(event) => {
							setDraft({ ...draft, min: event.target.value });
						}}
						className={cn(FIELD, "max-w-48 tabular-nums")}
					/>
				</Field>
				<Field label={t("casino.maxBet")} hint={t("casino.maxHint")} htmlFor="casino-max-bet">
					<input
						id="casino-max-bet"
						type="number"
						inputMode="numeric"
						min={1}
						value={draft.max}
						placeholder={t("casino.noLimit")}
						onChange={(event) => {
							setDraft({ ...draft, max: event.target.value });
						}}
						className={cn(FIELD, "max-w-48 tabular-nums")}
					/>
				</Field>

				{problem !== null && <Warning>{problem}</Warning>}
				{refusal("limits")}

				<RowActions>
					<Button
						disabled={!isDirty(draft, settings) || limits === null || problem !== null || save.isPending}
						onClick={() => {
							if (limits === null) return;
							setSource("limits");
							save.mutate(limits);
						}}
					>
						{t("common.saveChanges")}
					</Button>
				</RowActions>
			</SettingRows>
		</>
	);
}
