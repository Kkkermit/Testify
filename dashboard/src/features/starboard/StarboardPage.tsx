import { STARBOARD_LIMITS, type StarboardPatch } from "@testify/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import {
	ChannelPicker,
	FIELD,
	Field,
	postableChannels,
	SavingIndicator,
	savingStateOf,
	Toggle,
	Warning,
} from "@/components/form";
import { Card, CARD_HEADING, PageHeader, Skeleton } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { thresholdFrom } from "@/features/starboard/starboard.utils";
import { useSaveStarboard, useStarboard } from "@/features/starboard/useStarboard";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

/** Where starred messages are reposted, how many stars that takes, and whether the author's own star counts. */
export function StarboardPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const starboard = useStarboard(guildId);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveStarboard(guildId);

	usePageTitle(t("starboard.title"), overview.data?.name);

	if (starboard.isError) return <ErrorState error={starboard.error} onRetry={() => void starboard.refetch()} />;
	if (starboard.isPending) return <Skeleton className="h-96 w-full" />;

	const settings = starboard.data;
	const postable = postableChannels(channels.data ?? []);
	const channel = postable.find((entry) => entry.id === settings.channelId)?.name ?? "";
	const write = (patch: StarboardPatch): void => {
		save.mutate(patch);
	};

	return (
		<>
			<PageHeader
				eyebrow={overview.data?.name}
				title={t("starboard.title")}
				subtitle={t("starboard.subtitle")}
				action={<SavingIndicator state={savingStateOf(save.isPending, save.isSuccess)} />}
			/>

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>{t("starboard.board")}</h2>
					<p className="text-muted-foreground text-sm">{t("starboard.boardBody")}</p>
				</div>

				<Toggle
					label={t("starboard.enabled")}
					hint={settings.channelId === null ? t("starboard.enabledHintNoChannel") : t("starboard.enabledHint")}
					checked={settings.enabled}
					disabled={save.isPending || (!settings.enabled && settings.channelId === null)}
					onChange={(enabled) => {
						write({ enabled });
					}}
				/>

				<ChannelPicker
					label={t("starboard.channel")}
					hint={t("starboard.channelHint")}
					channels={postable}
					value={settings.channelId}
					allowNone={false}
					onChange={(channelId) => {
						write({ channelId });
					}}
				/>
				{settings.channelId !== null && !settings.canSend && <Warning>{t("common.cannotPostIn", { channel })}</Warning>}

				<ThresholdField key={settings.threshold} stored={settings.threshold} onSave={write} />

				<Toggle
					label={t("starboard.selfStar")}
					hint={t("starboard.selfStarHint")}
					checked={settings.selfStar}
					disabled={save.isPending}
					onChange={(selfStar) => {
						write({ selfStar });
					}}
				/>

				<p className="text-muted-foreground text-sm">
					{t("starboard.posts", { count: settings.posts })} · {t("starboard.deleting")}
				</p>

				{save.error !== null && (
					<Warning>{save.error instanceof ApiError ? save.error.message : t("common.couldNotSave")}</Warning>
				)}
			</Card>
		</>
	);
}

/** Keyed by the stored value, so a save that lands puts the box back in step with it. */
function ThresholdField({
	stored,
	onSave,
}: {
	stored: number;
	onSave: (patch: StarboardPatch) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [text, setText] = useState(String(stored));
	const threshold = thresholdFrom(text);
	const range = { min: STARBOARD_LIMITS.minThreshold, max: STARBOARD_LIMITS.maxThreshold };

	return (
		<Field label={t("starboard.threshold")} htmlFor="starboard-threshold" hint={t("starboard.thresholdHint", range)}>
			<input
				id="starboard-threshold"
				inputMode="numeric"
				value={text}
				aria-invalid={threshold === null}
				onChange={(event) => {
					setText(event.target.value);
				}}
				onBlur={() => {
					if (threshold !== null && threshold !== stored) onSave({ threshold });
				}}
				className={cn(FIELD, "max-w-40 font-mono tabular-nums", threshold === null && "border-destructive")}
			/>
			{threshold === null && <Warning>{t("starboard.thresholdOutOfRange", range)}</Warning>}
		</Field>
	);
}
