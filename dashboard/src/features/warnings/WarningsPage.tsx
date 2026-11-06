import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { PageHeader, Skeleton, Summary } from "@/components/primitives";
import { NeedsPermissionPanel } from "@/features/guild-overview/components/NeedsPermission";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useHolds, useLacks } from "@/features/guild-overview/useLacks";
import { PunishmentsCard } from "@/features/warnings/components/PunishmentsCard";
import { WarningsListCard } from "@/features/warnings/components/WarningsListCard";
import { WarnMemberCard } from "@/features/warnings/components/WarnMemberCard";
import { usePunishments } from "@/features/warnings/useWarnings";
import { warningsSummary } from "@/features/warnings/warnings.utils";
import { usePageTitle } from "@/hooks/usePageTitle";

export function WarningsPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	const lacks = useLacks(guildId);
	const holds = useHolds(guildId);
	const punishments = usePunishments(guildId, holds("ManageGuild"));
	const blocked = lacks("ModerateMembers");
	const mayModerate = holds("ModerateMembers");

	usePageTitle(t("warnings.title"), overview.data?.name);

	return (
		<>
			<PageHeader server={overview.data} title={t("warnings.title")} subtitle={t("warnings.subtitle")} />
			{punishments.data !== undefined && <Summary>{warningsSummary(punishments.data, t)}</Summary>}
			{lacks("ManageGuild") ? (
				<NeedsPermissionPanel title={t("warnings.punishmentsTitle")} permission="ManageGuild" />
			) : holds("ManageGuild") ? (
				<PunishmentsCard guildId={guildId} />
			) : (
				<Skeleton className="h-40 w-full" />
			)}
			{blocked ? (
				<>
					<NeedsPermissionPanel title={t("warnings.warnTitle")} permission="ModerateMembers" />
					<NeedsPermissionPanel title={t("warnings.recentTitle")} permission="ModerateMembers" />
				</>
			) : mayModerate ? (
				<>
					<WarnMemberCard guildId={guildId} />
					<WarningsListCard guildId={guildId} />
				</>
			) : (
				<Skeleton className="h-48 w-full" />
			)}
		</>
	);
}
