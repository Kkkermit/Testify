import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Refusal, SavingIndicator, savingStateOf } from "@/components/form";
import { PageHeader, Skeleton, Summary } from "@/components/primitives";
import { NeedsPermissionPanel, NotGivenPanel } from "@/features/guild-overview/components/NeedsPermission";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useLacks, useMayOpen } from "@/features/guild-overview/useLacks";
import { LevelCard } from "@/features/members/components/LevelCard";
import { MemberIdentity, MemberStanding } from "@/features/members/components/MemberIdentity";
import { MoneyCard } from "@/features/members/components/MoneyCard";
import { NicknameCard } from "@/features/members/components/NicknameCard";
import { RolesCard } from "@/features/members/components/RolesCard";
import { SanctionCard } from "@/features/members/components/SanctionCard";
import { SoftbanCard } from "@/features/members/components/SoftbanCard";
import { TimeoutCard } from "@/features/members/components/TimeoutCard";
import { WarningsCard } from "@/features/members/components/WarningsCard";
import { inviteLine, memberSummary, softbanActive } from "@/features/members/memberDetail.utils";
import { useMemberActions } from "@/features/members/useMemberActions";
import { useFeaturesOff } from "@/features/site/useFeaturesOff";
import { outcomeText } from "@/features/warnings/warnings.utils";
import { usePageTitle } from "@/hooks/usePageTitle";

export function MemberDetailPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "", userId = "" } = useParams();

	const overview = useGuildOverview(guildId);
	const lacks = useLacks(guildId);
	const mayOpen = useMayOpen(guildId);
	const featuresOff = useFeaturesOff();
	const actions = useMemberActions(guildId, userId);
	const { member, warn, edit, remove, clear, money, level, lift, kick, ban, busy, failure } = actions;
	const [result, setResult] = useState<string | null>(null);

	usePageTitle(member.data?.displayName ?? t("members.member"), overview.data?.name);

	if (member.isError) return <ErrorState error={member.error} onRetry={() => void member.refetch()} />;
	if (member.data === undefined) return <Skeleton className="h-96 w-full" />;

	const detail = member.data;
	const canModerate = detail.moderationProblem === null;

	return (
		<>
			<PageHeader
				server={overview.data}
				title={detail.displayName}
				subtitle={`@${detail.username}`}
				back={{ to: `/guilds/${guildId}/members`, label: t("members.backToMembers") }}
				action={<SavingIndicator state={savingStateOf(busy, warn.isSuccess || edit.isSuccess)} />}
			/>

			<Summary>
				{[memberSummary(detail, t), inviteLine(detail, t)]
					.filter((sentence) => sentence !== null)
					.join(t("common.sentenceSeparator"))}
			</Summary>

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

			{canModerate &&
				!featuresOff.has("economy") &&
				(lacks("Administrator") ? (
					<NeedsPermissionPanel title={t("members.money")} permission="Administrator" />
				) : (
					<MoneyCard
						detail={detail}
						busy={busy}
						onChange={(purse, delta) => {
							money.mutate({ purse, delta });
						}}
					/>
				))}
			{canModerate &&
				!featuresOff.has("levelling") &&
				(lacks("Administrator") ? (
					<NeedsPermissionPanel title={t("members.levelAndXp")} permission="Administrator" />
				) : (
					<LevelCard
						detail={detail}
						busy={busy}
						onChange={(body) => {
							level.mutate(body);
						}}
					/>
				))}

			{/* Roles are judged role by role rather than by who outranks whom, so they stay when the rest cannot. */}
			{canModerate ? (
				<>
					{lacks("ManageNicknames") ? (
						<NeedsPermissionPanel title={t("members.nicknameTitle")} permission="ManageNicknames" />
					) : (
						<NicknameCard
							key={detail.nickname ?? ""}
							detail={detail}
							busy={busy}
							onSave={(nickname) => {
								actions.rename.mutate({ nickname });
							}}
						/>
					)}
					<RolesCard guildId={guildId} userId={userId} />
				</>
			) : (
				detail.inGuild && <RolesCard guildId={guildId} userId={userId} />
			)}

			{lacks("ModerateMembers") ? (
				<NeedsPermissionPanel title={t("members.warnings")} permission="ModerateMembers" />
			) : !mayOpen("warnings") ? (
				<NotGivenPanel title={t("members.warnings")} screen={t("nav.warnings")} />
			) : (
				<WarningsCard
					detail={detail}
					busy={busy}
					result={result}
					onWarn={(reason, done) => {
						warn.mutate(
							{ userId, reason },
							{
								onSuccess: (added) => {
									setResult(outcomeText(added.outcome, t));
									done();
								},
							},
						);
					}}
					onEdit={(warnId, reason, done) => {
						edit.mutate({ userId, warnId, reason }, { onSuccess: done });
					}}
					onRemove={(warnId) => {
						remove.mutate({ userId, warnId });
					}}
					onClear={(done) => {
						clear.mutate({ userId }, { onSuccess: done });
					}}
				/>
			)}

			{canModerate && lacks("ModerateMembers") && (
				<NeedsPermissionPanel title={t("members.timeoutTitle")} permission="ModerateMembers" />
			)}
			{canModerate && !lacks("ModerateMembers") && (
				<TimeoutCard
					detail={detail}
					busy={busy}
					onTimeout={(minutes, reason, confirm) => {
						actions.timeout.mutate({ minutes, reason, confirm });
					}}
					onLift={() => {
						actions.liftTimeout.mutate();
					}}
				/>
			)}

			{(canModerate || !detail.inGuild) && (
				<SanctionCard
					detail={detail}
					busy={busy}
					missing={(["KickMembers", "BanMembers"] as const).filter(lacks)}
					onKick={(reason, confirm) => {
						kick.mutate({ reason, confirm });
					}}
					onBan={(reason, confirm, deleteDays) => {
						ban.mutate({ reason, confirm, deleteDays });
					}}
				/>
			)}

			<Refusal error={failure} />
		</>
	);
}
