import { BOT_IDENTITY_LIMITS } from "@testify/shared";
import { Pause, Play, Power } from "lucide-react";
import { useState } from "react";
import { Field, FIELD, SavingIndicator, savingStateOf, Warning } from "@/components/form";
import { Badge, Button, Card, Skeleton } from "@/components/primitives";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { useBot } from "@/features/auth/useBot";
import { useBotControl, useBotIdentity, useGateway, useShutdown } from "@/features/owner/useControl";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dateAndTime } from "@/lib/datetime";
import { sanitiseInput } from "@/lib/sanitise";

/** There is no Start: this API is served by the bot process, so a stopped bot has nothing left to answer with. */
export function ControlTab(): React.JSX.Element {
	const control = useBotControl();
	const gateway = useGateway();
	const shutdown = useShutdown();
	const bot = useBot();
	const identity = useBotIdentity();

	const [name, setName] = useState<string | null>(null);
	const [confirm, setConfirm] = useState("");

	if (control.isPending || control.data === undefined) return <Skeleton className="h-64 w-full" />;

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
						<h2 className={CARD_HEADING}>Running state</h2>
						<p className="text-muted-foreground text-sm">
							{paused
								? "Testify is connected but refusing everything. No commands, no XP, no automod."
								: "Testify is answering commands normally."}
						</p>
					</div>
					<Badge tone={paused ? "warning" : "success"}>{paused ? "Paused" : "Running"}</Badge>
				</div>

				<dl className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
					<div className="flex gap-2">
						<dt>Servers</dt>
						<dd className="text-foreground font-mono tabular-nums">{state.guilds}</dd>
					</div>
					<div className="flex gap-2">
						<dt>Gateway ping</dt>
						<dd className="text-foreground font-mono tabular-nums">
							{state.pingMs === null ? "—" : `${String(state.pingMs)} ms`}
						</dd>
					</div>
					{state.since !== null && (
						<div className="flex gap-2">
							<dt>Paused since</dt>
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
						{paused ? "Resume Testify" : "Pause Testify"}
					</Button>
					<SavingIndicator state={savingStateOf(gateway.isPending, gateway.isSuccess)} />
				</div>

				{gateway.error !== null && (
					<Warning>{gateway.error instanceof ApiError ? gateway.error.message : "That did not work."}</Warning>
				)}
			</Card>

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>Name and picture</h2>
					<p className="text-muted-foreground text-sm">
						The bot's global profile, in every server at once. Discord has no per-server picture for bots — a manager
						gets a nickname and nothing more.
					</p>
				</div>

				<Field label="Username" htmlFor="bot-name">
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
							Rename
						</Button>
						<SavingIndicator state={savingStateOf(identity.isPending, identity.isSuccess)} />
					</div>
					<p className="text-muted-foreground text-xs">
						Discord allows two username changes an hour, and refuses the rest — the message below is theirs, not ours.
					</p>
				</Field>

				{identity.error !== null && (
					<Warning>{identity.error instanceof ApiError ? identity.error.message : "Discord refused that."}</Warning>
				)}
			</Card>

			<Card className="border-destructive/40 flex flex-col gap-3">
				<div>
					<h2 className={CARD_HEADING}>Shut down</h2>
					<p className="text-muted-foreground text-sm">
						Stops the whole process, and this dashboard with it — the bot serves it. Only your host can start it again:
						systemd, Docker or a terminal.
					</p>
				</div>

				<Field
					htmlFor="shutdown-confirm"
					label={
						<>
							Type <span className="text-foreground font-mono">shut down</span> to confirm
						</>
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
							disabled={confirm !== "shut down" || shutdown.isPending}
							onClick={() => {
								shutdown.mutate();
							}}
						>
							<Power size={15} aria-hidden="true" />
							Shut down
						</Button>
					</div>
				</Field>

				{shutdown.isSuccess && <Warning>Testify is stopping. This page will stop responding in a moment.</Warning>}
			</Card>
		</div>
	);
}
