import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { SavingIndicator, savingStateOf, Warning } from "@/components/form";
import { PageHeader, Skeleton } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { LevelCard } from "@/features/members/components/LevelCard";
import { MemberIdentity, MemberStanding } from "@/features/members/components/MemberIdentity";
import { MoneyCard } from "@/features/members/components/MoneyCard";
import { SoftbanCard } from "@/features/members/components/SoftbanCard";
import { WarningsCard } from "@/features/members/components/WarningsCard";
import { softbanActive } from "@/features/members/memberDetail.utils";
import { useMemberActions } from "@/features/members/useMemberActions";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";

export function MemberDetailPage(): React.JSX.Element {
	const { guildId = "", userId = "" } = useParams();

	const overview = useGuildOverview(guildId);
	const { member, warn, remove, clear, money, level, lift, busy, failure } = useMemberActions(guildId, userId);

	usePageTitle(member.data?.displayName ?? "Member", overview.data?.name);

	if (member.isError) return <ErrorState error={member.error} onRetry={() => void member.refetch()} />;
	if (member.data === undefined) return <Skeleton className="h-96 w-full" />;

	const detail = member.data;
	const canModerate = detail.moderationProblem === null;

	return (
		<>
			<PageHeader
				title={detail.displayName}
				subtitle={`@${detail.username}`}
				action={<SavingIndicator state={savingStateOf(busy, warn.isSuccess)} />}
			/>

			{/* `py-1` carries it past the 24px WCAG 2.2 target minimum; the margin absorbs the padding it adds. */}
			<Link
				to={`/guilds/${guildId}/members`}
				className="text-muted-foreground hover:text-foreground -mt-3 flex w-fit items-center gap-1 py-1 text-sm"
			>
				<ArrowLeft size={16} aria-hidden="true" /> Back to the leaderboards
			</Link>

			<MemberIdentity detail={detail} />
			<MemberStanding detail={detail} />

			{softbanActive(detail) && detail.softban !== null && (
				<SoftbanCard
					softban={detail.softban}
					busy={busy}
					onLift={() => {
						lift.mutate();
					}}
				/>
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

			<WarningsCard
				detail={detail}
				busy={busy}
				onWarn={(reason, done) => {
					warn.mutate(reason, { onSuccess: done });
				}}
				onRemove={(warnId) => {
					remove.mutate(warnId);
				}}
				onClear={(done) => {
					clear.mutate(undefined, { onSuccess: done });
				}}
			/>

			{failure !== null && (
				<Warning>{failure instanceof ApiError ? failure.message : "That could not be saved."}</Warning>
			)}
		</>
	);
}
