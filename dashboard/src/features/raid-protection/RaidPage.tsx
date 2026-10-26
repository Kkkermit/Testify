import { RAID_LIMITS, type RaidPatch } from "@testify/shared";
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
	SELECT,
	Toggle,
	Warning,
} from "@/components/form";
import { Card, CARD_HEADING, PageHeader, Skeleton } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels, useRoles } from "@/features/levelling/useLevelling";
import { hasWork, numberIn } from "@/features/raid-protection/raid.utils";
import { useRaid, useUpdateRaid } from "@/features/raid-protection/useRaid";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

/** Holding back brand new accounts, and where staff hear about a spike in joins. */
export function RaidPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const raid = useRaid(guildId);
	const channels = useChannels(guildId);
	const roles = useRoles(guildId);
	const overview = useGuildOverview(guildId);
	const save = useUpdateRaid(guildId);

	usePageTitle(t("raid.title"), overview.data?.name);

	if (raid.isError) return <ErrorState error={raid.error} onRetry={() => void raid.refetch()} />;
	if (raid.isPending) return <Skeleton className="h-96 w-full" />;

	const settings = raid.data;
	const postable = postableChannels(channels.data ?? []);
	const channel = postable.find((entry) => entry.id === settings.alertChannelId)?.name ?? "";
	const pingable = (roles.data ?? []).filter((role) => role.id !== guildId && !role.managed);
	const write = (patch: RaidPatch): void => {
		save.mutate(patch);
	};

	return (
		<>
			<PageHeader
				eyebrow={overview.data?.name}
				title={t("raid.title")}
				subtitle={t("raid.subtitle")}
				action={<SavingIndicator state={savingStateOf(save.isPending, save.isSuccess)} />}
			/>

			{save.error !== null && (
				<Warning>{save.error instanceof ApiError ? save.error.message : t("common.couldNotSave")}</Warning>
			)}

			<Card className="flex flex-col gap-4">
				<Toggle
					label={t("raid.enabled")}
					hint={hasWork(settings) ? t("raid.enabledHint") : t("raid.enabledHintNothing")}
					checked={settings.enabled}
					disabled={save.isPending || (!settings.enabled && !hasWork(settings))}
					onChange={(enabled) => {
						write({ enabled });
					}}
				/>
				<p className="text-muted-foreground text-sm">{t("raid.neverKicks")}</p>
			</Card>

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>{t("raid.hold")}</h2>
					<p className="text-muted-foreground text-sm">{t("raid.holdBody")}</p>
				</div>

				<NumberField
					key={`age-${String(settings.minAccountAgeDays)}`}
					id="raid-age"
					label={t("raid.minAge")}
					hint={t("raid.minAgeHint", { max: RAID_LIMITS.maxAccountAgeDays })}
					stored={settings.minAccountAgeDays}
					min={0}
					max={RAID_LIMITS.maxAccountAgeDays}
					onSave={(minAccountAgeDays) => {
						write({ minAccountAgeDays });
					}}
				/>
				{settings.minAccountAgeDays > 0 && !settings.canHold && <Warning>{t("raid.cannotHold")}</Warning>}
			</Card>

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>{t("raid.alerts")}</h2>
					<p className="text-muted-foreground text-sm">{t("raid.alertsBody")}</p>
				</div>

				<ChannelPicker
					label={t("raid.channel")}
					hint={t("raid.channelHint")}
					channels={postable}
					value={settings.alertChannelId}
					noneLabel={t("raid.noAlerts")}
					onChange={(alertChannelId) => {
						write({ alertChannelId });
					}}
				/>
				{settings.alertChannelId !== null && !settings.canSend && (
					<Warning>{t("common.cannotPostIn", { channel })}</Warning>
				)}

				<Field label={t("raid.ping")} hint={t("raid.pingHint")}>
					<select
						className={SELECT}
						value={settings.pingRoleId ?? ""}
						disabled={settings.alertChannelId === null}
						onChange={(event) => {
							write({ pingRoleId: event.target.value === "" ? null : event.target.value });
						}}
					>
						<option value="">{t("raid.pingNobody")}</option>
						{pingable.map((role) => (
							<option key={role.id} value={role.id}>
								{role.name}
							</option>
						))}
					</select>
				</Field>
				{!settings.canPing && <Warning>{t("raid.cannotPing")}</Warning>}

				<div className="flex flex-wrap gap-4">
					<NumberField
						key={`joins-${String(settings.spikeJoins)}`}
						id="raid-joins"
						label={t("raid.joins")}
						hint={t("raid.range", { min: RAID_LIMITS.minSpikeJoins, max: RAID_LIMITS.maxSpikeJoins })}
						stored={settings.spikeJoins}
						min={RAID_LIMITS.minSpikeJoins}
						max={RAID_LIMITS.maxSpikeJoins}
						onSave={(spikeJoins) => {
							write({ spikeJoins });
						}}
					/>
					<NumberField
						key={`minutes-${String(settings.spikeMinutes)}`}
						id="raid-minutes"
						label={t("raid.minutes")}
						hint={t("raid.range", { min: RAID_LIMITS.minSpikeMinutes, max: RAID_LIMITS.maxSpikeMinutes })}
						stored={settings.spikeMinutes}
						min={RAID_LIMITS.minSpikeMinutes}
						max={RAID_LIMITS.maxSpikeMinutes}
						onSave={(spikeMinutes) => {
							write({ spikeMinutes });
						}}
					/>
				</div>
				<p className="text-muted-foreground text-sm">{t("raid.memory", { minutes: RAID_LIMITS.alertEveryMinutes })}</p>
			</Card>
		</>
	);
}

/** Keyed by the stored value, so a save that lands puts the box back in step with it. */
function NumberField({
	id,
	label,
	hint,
	stored,
	min,
	max,
	onSave,
}: {
	id: string;
	label: string;
	hint: string;
	stored: number;
	min: number;
	max: number;
	onSave: (value: number) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [text, setText] = useState(String(stored));
	const value = numberIn(text, min, max);

	return (
		<Field label={label} htmlFor={id} hint={hint}>
			<input
				id={id}
				inputMode="numeric"
				value={text}
				aria-invalid={value === null}
				onChange={(event) => {
					setText(event.target.value);
				}}
				onBlur={() => {
					if (value !== null && value !== stored) onSave(value);
				}}
				className={cn(FIELD, "max-w-40 font-mono tabular-nums", value === null && "border-destructive")}
			/>
			{value === null && <Warning>{t("raid.outOfRange", { min, max })}</Warning>}
		</Field>
	);
}
