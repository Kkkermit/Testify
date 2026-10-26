import { type ToolChannel } from "@testify/shared";
import { Lock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Field, SavingIndicator, savingStateOf, SELECT, Toggle, Warning } from "@/components/form";
import {
	Badge,
	Button,
	Card,
	CARD_HEADING,
	DividedList,
	EmptyState,
	PageHeader,
	Skeleton,
} from "@/components/primitives";
import { restricted, slowmodeChoices, slowmodeText } from "@/features/channel-tools/channelTools.utils";
import { useChannelTools, useUpdateChannel } from "@/features/channel-tools/useChannelTools";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";

/** Lock a channel or slow it down, from a picker, with every channel already restricted listed beneath. */
export function ChannelToolsPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	const tools = useChannelTools(guildId);
	const update = useUpdateChannel(guildId);
	const [chosenId, setChosenId] = useState<string | null>(null);

	usePageTitle(t("channelTools.title"), overview.data?.name);

	if (tools.isError) return <ErrorState error={tools.error} onRetry={() => void tools.refetch()} />;
	if (tools.isPending) return <Skeleton className="h-96 w-full" />;

	const channels = tools.data.channels;
	const chosen = channels.find((channel) => channel.id === chosenId) ?? channels[0];
	const limited = restricted(channels);

	return (
		<>
			<PageHeader
				eyebrow={overview.data?.name}
				title={t("channelTools.title")}
				subtitle={t("channelTools.subtitle")}
				action={<SavingIndicator state={savingStateOf(update.isPending, update.isSuccess)} />}
			/>

			{chosen === undefined ? (
				<Card>
					<EmptyState icon={<Lock size={28} />} title={t("channelTools.noneTitle")} body={t("channelTools.noneBody")} />
				</Card>
			) : (
				<Card className="flex flex-col gap-4">
					<Field label={t("channelTools.channel")} htmlFor="channel-tools-channel">
						<select
							id="channel-tools-channel"
							className={SELECT}
							value={chosen.id}
							onChange={(event) => {
								setChosenId(event.target.value);
								update.reset();
							}}
						>
							{channels.map((channel) => (
								<option key={channel.id} value={channel.id}>
									#{channel.name}
									{channel.category === null ? "" : ` · ${channel.category}`}
								</option>
							))}
						</select>
					</Field>

					<ChannelControls
						key={chosen.id}
						channel={chosen}
						busy={update.isPending}
						onChange={(patch) => {
							update.mutate({ channelId: chosen.id, ...patch });
						}}
					/>

					{update.error !== null && (
						<Warning>{update.error instanceof ApiError ? update.error.message : t("common.couldNotSave")}</Warning>
					)}
				</Card>
			)}

			<section aria-labelledby="restricted-heading">
				<Card className="flex flex-col gap-4">
					<div>
						<h2 id="restricted-heading" className={CARD_HEADING}>
							{t("channelTools.restricted")}
						</h2>
						<p className="text-muted-foreground text-sm">{t("channelTools.restrictedBody")}</p>
					</div>
					{limited.length === 0 ? (
						<p className="text-muted-foreground text-sm">{t("channelTools.nothingRestricted")}</p>
					) : (
						<DividedList>
							{limited.map((channel) => (
								<RestrictedRow
									key={channel.id}
									channel={channel}
									onChoose={() => {
										setChosenId(channel.id);
										update.reset();
									}}
								/>
							))}
						</DividedList>
					)}
				</Card>
			</section>
		</>
	);
}

function ChannelControls({
	channel,
	busy,
	onChange,
}: {
	channel: ToolChannel;
	busy: boolean;
	onChange: (patch: { locked?: boolean; slowmodeSeconds?: number }) => void;
}): React.JSX.Element {
	const { t, i18n } = useTranslation();

	return (
		<>
			<Toggle
				label={t("channelTools.locked")}
				hint={t("channelTools.lockedHint")}
				checked={channel.locked}
				disabled={busy || !channel.canLock}
				onChange={(locked) => {
					onChange({ locked });
				}}
			/>
			{!channel.canLock && <Warning>{t("channelTools.cannotLock")}</Warning>}

			<Field label={t("channelTools.slowmode")} hint={t("channelTools.slowmodeHint")} htmlFor="channel-tools-slowmode">
				<select
					id="channel-tools-slowmode"
					className={SELECT}
					value={channel.slowmodeSeconds}
					disabled={busy || !channel.canSlow}
					onChange={(event) => {
						onChange({ slowmodeSeconds: Number(event.target.value) });
					}}
				>
					{slowmodeChoices(channel.slowmodeSeconds).map((seconds) => (
						<option key={seconds} value={seconds}>
							{seconds === 0 ? t("channelTools.off") : slowmodeText(seconds, i18n.language)}
						</option>
					))}
				</select>
			</Field>
			{!channel.canSlow && <Warning>{t("channelTools.cannotSlow")}</Warning>}
		</>
	);
}

function RestrictedRow({ channel, onChoose }: { channel: ToolChannel; onChoose: () => void }): React.JSX.Element {
	const { t, i18n } = useTranslation();

	return (
		<li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-sm font-medium">#{channel.name}</span>
				{channel.locked && <Badge tone="warning">{t("channelTools.lockedBadge")}</Badge>}
				{channel.slowmodeSeconds > 0 && (
					<Badge>{t("channelTools.slowBadge", { length: slowmodeText(channel.slowmodeSeconds, i18n.language) })}</Badge>
				)}
			</div>
			<Button variant="ghost" aria-label={t("channelTools.chooseName", { name: channel.name })} onClick={onChoose}>
				{t("channelTools.choose")}
			</Button>
		</li>
	);
}
