import { TEMP_VOICE_LIMITS, type TempVoicePatch } from "@testify/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import {
	ChannelKindPicker,
	FIELD,
	Field,
	SavingIndicator,
	savingStateOf,
	SettingRows,
	Toggle,
	Warning,
} from "@/components/form";
import { Button, PageHeader, Skeleton, Summary } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { nameTemplateFrom, tempVoiceSummary, userLimitFrom } from "@/features/temp-voice/tempVoice.utils";
import { useMakeLobby, useSaveTempVoice, useTempVoice } from "@/features/temp-voice/useTempVoice";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { channelLabel } from "@/lib/channels";
import { cn } from "@/lib/cn";

type GroupName = "lobby" | "channels";

export function TempVoicePage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const [origin, setOrigin] = useState<GroupName>("lobby");

	const tempVoice = useTempVoice(guildId);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveTempVoice(guildId);
	const lobby = useMakeLobby(guildId);

	usePageTitle(t("tempVoice.title"), overview.data?.name);

	if (tempVoice.isError) return <ErrorState error={tempVoice.error} onRetry={() => void tempVoice.refetch()} />;
	if (tempVoice.isPending) return <Skeleton className="h-96 w-full" />;

	const settings = tempVoice.data;
	const all = channels.data ?? [];
	const message = (error: Error | null): string | null =>
		error === null ? null : error instanceof ApiError ? error.message : t("common.couldNotSave");
	const write = (group: GroupName, patch: TempVoicePatch): void => {
		setOrigin(group);
		save.mutate(patch);
	};
	const saveFailure = message(save.error);
	// A voice channel is named without the # Discord gives a text one.
	const lobbyName =
		all.find((channel) => channel.id === settings.lobbyChannelId)?.name ??
		channelLabel(all, settings.lobbyChannelId, t);

	return (
		<>
			<PageHeader
				server={overview.data}
				title={t("tempVoice.title")}
				subtitle={t("tempVoice.subtitle")}
				action={
					<SavingIndicator
						state={savingStateOf(save.isPending || lobby.isPending, save.isSuccess || lobby.isSuccess)}
					/>
				}
			/>

			<Summary>{tempVoiceSummary(settings, lobbyName, t)}</Summary>
			{!settings.canManage && <Warning>{t("tempVoice.cannotManage")}</Warning>}

			<SettingRows title={t("tempVoice.lobbyCard")} description={t("tempVoice.lobbyBody")}>
				<Toggle
					label={t("tempVoice.enabled")}
					hint={settings.lobbyChannelId === null ? t("tempVoice.enabledHintNoLobby") : t("tempVoice.enabledHint")}
					checked={settings.enabled}
					disabled={save.isPending || (!settings.enabled && settings.lobbyChannelId === null)}
					onChange={(enabled) => {
						write("lobby", { enabled });
					}}
				/>

				<ChannelKindPicker
					kind="voice"
					label={t("tempVoice.lobby")}
					hint={t("tempVoice.lobbyHint")}
					noneLabel={t("tempVoice.noLobby")}
					channels={all}
					value={settings.lobbyChannelId}
					onChange={(lobbyChannelId) => {
						write("lobby", { lobbyChannelId });
					}}
				>
					{settings.lobbyChannelId === null && (
						<div>
							<Button
								disabled={lobby.isPending}
								onClick={() => {
									lobby.mutate(undefined);
								}}
							>
								{lobby.isPending ? t("tempVoice.making") : t("tempVoice.makeLobby")}
							</Button>
						</div>
					)}
				</ChannelKindPicker>
			</SettingRows>
			{message(lobby.error) !== null && <Warning>{message(lobby.error)}</Warning>}
			{origin === "lobby" && saveFailure !== null && <Warning>{saveFailure}</Warning>}

			<SettingRows title={t("tempVoice.channels")} description={t("tempVoice.active", { count: settings.active })}>
				<ChannelKindPicker
					kind="category"
					label={t("tempVoice.category")}
					hint={t("tempVoice.categoryHint")}
					noneLabel={t("tempVoice.lobbyCategory")}
					channels={all}
					value={settings.categoryId}
					onChange={(categoryId) => {
						write("channels", { categoryId });
					}}
				/>

				<NameField
					key={settings.nameTemplate}
					stored={settings.nameTemplate}
					onSave={(nameTemplate) => {
						write("channels", { nameTemplate });
					}}
				/>

				<LimitField
					key={settings.userLimit}
					stored={settings.userLimit}
					onSave={(userLimit) => {
						write("channels", { userLimit });
					}}
				/>
			</SettingRows>
			{origin === "channels" && saveFailure !== null && <Warning>{saveFailure}</Warning>}
			<p className="text-muted-foreground text-sm">{t("tempVoice.ownerRights")}</p>
		</>
	);
}

/** Keyed by the stored pattern, so a save that lands resets the box. */
function NameField({ stored, onSave }: { stored: string; onSave: (name: string) => void }): React.JSX.Element {
	const { t } = useTranslation();
	const [text, setText] = useState(stored);
	const name = nameTemplateFrom(text);

	return (
		<Field label={t("tempVoice.name")} htmlFor="temp-voice-name" hint={t("tempVoice.nameHint")}>
			<input
				id="temp-voice-name"
				value={text}
				maxLength={TEMP_VOICE_LIMITS.maxTemplate}
				aria-invalid={name === null}
				onChange={(event) => {
					setText(event.target.value);
				}}
				onBlur={() => {
					if (name !== null && name !== stored) onSave(name);
				}}
				className={cn(FIELD, name === null && "border-destructive")}
			/>
			{name === null && <Warning>{t("tempVoice.nameEmpty")}</Warning>}
		</Field>
	);
}

function LimitField({ stored, onSave }: { stored: number; onSave: (limit: number) => void }): React.JSX.Element {
	const { t } = useTranslation();
	const [text, setText] = useState(String(stored));
	const limit = userLimitFrom(text);

	return (
		<Field label={t("tempVoice.limit")} htmlFor="temp-voice-limit" hint={t("tempVoice.limitHint")}>
			<input
				id="temp-voice-limit"
				inputMode="numeric"
				value={text}
				aria-invalid={limit === null}
				onChange={(event) => {
					setText(event.target.value);
				}}
				onBlur={() => {
					if (limit !== null && limit !== stored) onSave(limit);
				}}
				className={cn(FIELD, "max-w-40 tabular-nums", limit === null && "border-destructive")}
			/>
			{limit === null && <Warning>{t("tempVoice.limitOutOfRange", { max: TEMP_VOICE_LIMITS.maxUserLimit })}</Warning>}
		</Field>
	);
}
