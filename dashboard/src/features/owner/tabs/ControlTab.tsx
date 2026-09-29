import { BOT_IDENTITY_LIMITS, MUSIC_SOURCE_CHOICES, type MusicSourceChoice, SHUTDOWN_PHRASE } from "@testify/shared";
import { Pause, Play, Power } from "lucide-react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { Field, FIELD, SavingIndicator, savingStateOf, Warning } from "@/components/form";
import { Badge, Button, Card, CARD_HEADING, SegmentedControl, Skeleton } from "@/components/primitives";
import { useBot } from "@/features/auth/useBot";
import {
	useBotControl,
	useBotIdentity,
	useGateway,
	useMusicSources,
	useSetMusicSources,
	useShutdown,
} from "@/features/owner/useControl";
import { type TranslationKey } from "@/i18n";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dateAndTime } from "@/lib/datetime";
import { sanitiseInput } from "@/lib/sanitise";

const SOURCE_LABELS: Record<MusicSourceChoice, { label: TranslationKey; hint: TranslationKey }> = {
	both: { label: "owner.sourceBoth", hint: "owner.sourceBothHint" },
	youtube: { label: "owner.sourceYoutube", hint: "owner.sourceYoutubeHint" },
	soundcloud: { label: "owner.sourceSoundcloud", hint: "owner.sourceSoundcloudHint" },
};

/** Its own read, so a failure here leaves the rest of the tab working. */
function MusicSourcesCard(): React.JSX.Element {
	const { t } = useTranslation();
	const setting = useMusicSources();
	const change = useSetMusicSources();

	return (
		<Card className="flex flex-col gap-4">
			<div>
				<h2 className={CARD_HEADING}>{t("owner.musicSources")}</h2>
				<p className="text-muted-foreground text-sm">{t("owner.musicSourcesBody")}</p>
			</div>

			{setting.isPending ? (
				<Skeleton className="h-9 w-72" />
			) : setting.data === undefined ? (
				<ErrorState as="h2" error={setting.error} onRetry={() => void setting.refetch()} />
			) : (
				<div className="flex flex-col gap-2">
					<div className="flex flex-wrap items-center gap-3">
						<SegmentedControl
							label={t("owner.musicSources")}
							segments={MUSIC_SOURCE_CHOICES.map((value) => ({
								value,
								label: t(SOURCE_LABELS[value].label),
								hint: t(SOURCE_LABELS[value].hint),
							}))}
							value={change.isPending ? change.variables : setting.data.sources}
							onChange={(sources) => {
								if (sources !== setting.data.sources) change.mutate(sources);
							}}
						/>
						<SavingIndicator state={savingStateOf(change.isPending, change.isSuccess)} />
					</div>
					<p className="text-muted-foreground text-sm">{t(SOURCE_LABELS[setting.data.sources].hint)}</p>
				</div>
			)}

			{change.error !== null && (
				<Warning>{change.error instanceof ApiError ? change.error.message : t("common.didNotWork")}</Warning>
			)}
		</Card>
	);
}

/** There is no Start: this API is served by the bot process, so a stopped bot has nothing left to answer with. */
export function ControlTab(): React.JSX.Element {
	const { t } = useTranslation();
	const control = useBotControl();
	const gateway = useGateway();
	const shutdown = useShutdown();
	const bot = useBot();
	const identity = useBotIdentity();

	const [name, setName] = useState<string | null>(null);
	const [confirm, setConfirm] = useState("");

	if (control.isPending) return <Skeleton className="h-64 w-full" />;
	// Without this the tab sits on a skeleton for ever, which reads as still loading rather than as failed.
	if (control.data === undefined)
		return <ErrorState as="h2" error={control.error} onRetry={() => void control.refetch()} />;

	const state = control.data;
	const paused = state.gateway === "paused";
	const currentName = bot.data?.username ?? "";
	// Null means "not edited yet"; an empty string is a real edit, and `?? currentName` would undo it.
	const draft = name ?? currentName;

	return (
		<div className="flex flex-col gap-4">
			<Card className="flex flex-col gap-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 className={CARD_HEADING}>{t("owner.runningState")}</h2>
						<p className="text-muted-foreground text-sm">{paused ? t("owner.pausedBody") : t("owner.runningBody")}</p>
					</div>
					<Badge tone={paused ? "warning" : "success"}>{t(paused ? "owner.paused" : "owner.running")}</Badge>
				</div>

				<dl className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
					<div className="flex gap-2">
						<dt>{t("owner.servers")}</dt>
						<dd className="text-foreground font-mono tabular-nums">{state.guilds}</dd>
					</div>
					<div className="flex gap-2">
						<dt>{t("owner.gatewayPing")}</dt>
						<dd className="text-foreground font-mono tabular-nums">
							{state.pingMs === null ? "—" : `${String(state.pingMs)} ms`}
						</dd>
					</div>
					{state.since !== null && (
						<div className="flex gap-2">
							<dt>{t("owner.pausedSince")}</dt>
							<dd className="text-foreground">{dateAndTime(state.since)}</dd>
						</div>
					)}
				</dl>

				<div className="flex flex-wrap items-center gap-3">
					<Button
						disabled={gateway.isPending}
						onClick={() => {
							gateway.mutate({ action: paused ? "resume" : "pause" });
						}}
					>
						{paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
						{t(paused ? "owner.resume" : "owner.pause")}
					</Button>
					<SavingIndicator state={savingStateOf(gateway.isPending, gateway.isSuccess)} />
				</div>

				{gateway.error !== null && (
					<Warning>{gateway.error instanceof ApiError ? gateway.error.message : t("common.didNotWork")}</Warning>
				)}
			</Card>

			<MusicSourcesCard />

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>{t("owner.nameAndPicture")}</h2>
					<p className="text-muted-foreground text-sm">{t("owner.identityBody")}</p>
				</div>

				<Field label={t("owner.username")} htmlFor="bot-name">
					<div className="flex flex-wrap items-center gap-2">
						<input
							id="bot-name"
							value={draft}
							maxLength={BOT_IDENTITY_LIMITS.maxUsername}
							onChange={(event) => {
								setName(event.target.value);
							}}
							className={cn(FIELD, "max-w-64")}
						/>
						<Button
							variant="secondary"
							disabled={draft.trim() === currentName || draft.trim().length < BOT_IDENTITY_LIMITS.minUsername}
							onClick={() => {
								identity.mutate({ username: sanitiseInput(draft) });
							}}
						>
							{t("owner.rename")}
						</Button>
						<SavingIndicator state={savingStateOf(identity.isPending, identity.isSuccess)} />
					</div>
					<p className="text-muted-foreground text-xs">{t("owner.renameLimit")}</p>
				</Field>

				{identity.error !== null && (
					<Warning>{identity.error instanceof ApiError ? identity.error.message : t("common.discordRefused")}</Warning>
				)}
			</Card>

			<Card className="border-destructive/40 flex flex-col gap-3">
				<div>
					<h2 className={CARD_HEADING}>{t("owner.shutDown")}</h2>
					<p className="text-muted-foreground text-sm">{t("owner.shutDownBody")}</p>
				</div>

				<Field
					htmlFor="shutdown-confirm"
					label={
						<Trans
							i18nKey="owner.typeToConfirm"
							values={{ name: SHUTDOWN_PHRASE }}
							components={{ name: <span className="text-foreground font-mono" /> }}
						/>
					}
				>
					<div className="flex flex-wrap items-center gap-2">
						<input
							id="shutdown-confirm"
							value={confirm}
							autoComplete="off"
							onChange={(event) => {
								setConfirm(event.target.value);
							}}
							className={cn(FIELD, "max-w-48")}
						/>
						<Button
							variant="destructive"
							disabled={confirm !== SHUTDOWN_PHRASE || shutdown.isPending}
							onClick={() => {
								shutdown.mutate();
							}}
						>
							<Power size={15} aria-hidden="true" />
							{t("owner.shutDown")}
						</Button>
					</div>
				</Field>

				{shutdown.isSuccess && <Warning>{t("owner.stopping")}</Warning>}

				{/* A refused shutdown otherwise looks exactly like a successful one: nothing on the page moves either way. */}
				{shutdown.error !== null && (
					<Warning>{shutdown.error instanceof ApiError ? shutdown.error.message : t("owner.couldNotShutDown")}</Warning>
				)}
			</Card>
		</div>
	);
}
