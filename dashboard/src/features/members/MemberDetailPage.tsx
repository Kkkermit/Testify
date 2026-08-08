import { WARNING_LIMITS, warningProblem } from "@testify/shared";
import { ArrowLeft, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Field, SavingIndicator, savingStateOf, Warning } from "@/components/form";
import { FIELD } from "@/components/form/fieldStyles";
import { Avatar, Badge, Button, Card, Figure, PageHeader, Skeleton } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { LevelCard } from "@/features/members/components/LevelCard";
import { MoneyCard } from "@/features/members/components/MoneyCard";
import { WarningList } from "@/features/members/components/WarningList";
import {
	clearConfirmed,
	describeJoined,
	softbanActive,
	statsOf,
	warningSummary,
} from "@/features/members/memberDetail.utils";
import {
	useChangeMoney,
	useClearWarnings,
	useLiftSoftban,
	useMemberDetail,
	useRemoveWarning,
	useSetLevel,
	useWarn,
} from "@/features/members/useMemberDetail";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";

export function MemberDetailPage(): React.JSX.Element {
	const { guildId = "", userId = "" } = useParams();

	const overview = useGuildOverview(guildId);
	const member = useMemberDetail(guildId, userId);
	const warn = useWarn(guildId, userId);
	const remove = useRemoveWarning(guildId, userId);
	const clear = useClearWarnings(guildId, userId);
	const money = useChangeMoney(guildId, userId);
	const level = useSetLevel(guildId, userId);
	const lift = useLiftSoftban(guildId, userId);

	const [reason, setReason] = useState("");
	const [confirming, setConfirming] = useState(false);
	const [typed, setTyped] = useState("");

	usePageTitle(member.data?.displayName ?? "Member", overview.data?.name);

	if (member.isError) return <ErrorState error={member.error} onRetry={() => void member.refetch()} />;
	if (member.data === undefined) return <Skeleton className="h-96 w-full" />;

	const detail = member.data;
	const busy = [warn, remove, clear, money, level, lift].some((one) => one.isPending);
	const canModerate = detail.moderationProblem === null;
	const problem = warningProblem(reason);
	const failure =
		[warn, remove, clear, money, level, lift].map((one) => one.error).find((error) => error !== null) ?? null;

	return (
		<>
			<PageHeader
				title={detail.displayName}
				subtitle={`@${detail.username}`}
				action={<SavingIndicator state={savingStateOf(busy, warn.isSuccess)} />}
			/>

			<Link
				to={`/guilds/${guildId}/members`}
				className="text-muted-foreground hover:text-foreground -mt-2 flex w-fit items-center gap-1 text-sm"
			>
				<ArrowLeft size={16} aria-hidden="true" /> Back to the leaderboards
			</Link>

			<Card className="flex flex-wrap items-center gap-4">
				<Avatar name={detail.displayName} url={detail.avatarUrl} size={56} seed={detail.userId} />

				<div className="min-w-0 flex-1">
					<p className="flex flex-wrap items-center gap-2 text-sm font-medium">
						{detail.displayName}
						{detail.isBot && <Badge>Bot</Badge>}
						{!detail.inGuild && <Badge tone="warning">Left the server</Badge>}
						{softbanActive(detail) && <Badge tone="danger">Softbanned</Badge>}
					</p>
					<p className="text-muted-foreground text-xs">{describeJoined(detail.joinedAt)}</p>

					{detail.roles.length > 0 && (
						<ul className="mt-2 flex flex-wrap gap-1">
							{detail.roles.slice(0, 12).map((role) => (
								<li key={role.id}>
									<Badge>{role.name}</Badge>
								</li>
							))}
						</ul>
					)}
				</div>
			</Card>

			{statsOf(detail).length > 0 && (
				<Card>
					<h2 className="text-base font-semibold">Standing in this server</h2>
					<dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
						{statsOf(detail).map((row) => (
							<Figure key={row.label} label={row.label} value={row.value} size="md" />
						))}
					</dl>
				</Card>
			)}

			{softbanActive(detail) && detail.softban !== null && (
				<Card className="flex flex-wrap items-end justify-between gap-4">
					<div className="flex flex-col gap-1">
						<h2 className="flex items-center gap-2 text-base font-semibold">
							<ShieldAlert size={18} className="text-destructive" aria-hidden="true" /> Active softban
						</h2>
						<p className="text-muted-foreground text-sm">{detail.softban.reason}</p>
						<p className="text-muted-foreground text-xs">
							Lifts{" "}
							<time dateTime={detail.softban.expiresAt}>{new Date(detail.softban.expiresAt).toLocaleString()}</time>
						</p>
					</div>

					{/* Not behind the hierarchy check: a softbanned user is banned, so they have no roles to compare. */}
					<Button
						variant="secondary"
						disabled={busy}
						onClick={() => {
							lift.mutate();
						}}
					>
						Lift it now
					</Button>
				</Card>
			)}

			{canModerate && (
				<div className="grid gap-6 lg:grid-cols-2 lg:items-start">
					<MoneyCard
						detail={detail}
						busy={busy}
						onChange={(purse, delta) => {
							money.mutate({ purse, delta });
						}}
					/>
					<LevelCard
						detail={detail}
						busy={busy}
						onChange={(body) => {
							level.mutate(body);
						}}
					/>
				</div>
			)}

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className="text-base font-semibold">Warnings</h2>
					<p className="text-muted-foreground text-sm">{warningSummary(detail.warnings)}</p>
				</div>

				{!canModerate && <Warning>{detail.moderationProblem}</Warning>}

				{detail.warnings.length > 0 && (
					<WarningList
						warnings={detail.warnings}
						busy={busy}
						canModerate={canModerate}
						onRemove={(warnId) => {
							remove.mutate(warnId);
						}}
					/>
				)}

				{canModerate && (
					<>
						<Field label="Issue a warning" hint="They are not notified from here." htmlFor="warn-reason">
							<input
								id="warn-reason"
								className={FIELD}
								value={reason}
								maxLength={WARNING_LIMITS.maxReason}
								placeholder="Why are they being warned?"
								onChange={(event) => {
									setReason(event.target.value);
								}}
							/>
						</Field>

						<div className="flex flex-wrap items-center gap-3">
							<Button
								disabled={problem !== null || busy}
								onClick={() => {
									warn.mutate(reason, {
										onSuccess: () => {
											setReason("");
										},
									});
								}}
							>
								Add warning
							</Button>

							{detail.warnings.length > 0 && !confirming && (
								<Button
									variant="ghost"
									disabled={busy}
									onClick={() => {
										setConfirming(true);
									}}
								>
									<Trash2 size={16} aria-hidden="true" /> Clear every warning
								</Button>
							)}
						</div>

						{confirming && (
							<div className="border-destructive/40 flex flex-col gap-3 rounded-lg border p-4">
								<Field label={`Type ${detail.username} to clear every warning`} htmlFor="clear-confirm">
									<input
										id="clear-confirm"
										className={FIELD}
										value={typed}
										autoComplete="off"
										onChange={(event) => {
											setTyped(event.target.value);
										}}
									/>
								</Field>
								<Warning>This deletes the whole record. It cannot be undone.</Warning>

								<div className="flex flex-wrap gap-3">
									<Button
										variant="destructive"
										disabled={!clearConfirmed(typed, detail) || busy}
										onClick={() => {
											clear.mutate(undefined, {
												onSuccess: () => {
													setConfirming(false);
													setTyped("");
												},
											});
										}}
									>
										Clear every warning
									</Button>
									<Button
										variant="ghost"
										onClick={() => {
											setConfirming(false);
											setTyped("");
										}}
									>
										Cancel
									</Button>
								</div>
							</div>
						)}
					</>
				)}

				{failure !== null && (
					<Warning>{failure instanceof ApiError ? failure.message : "That could not be saved."}</Warning>
				)}
			</Card>
		</>
	);
}
